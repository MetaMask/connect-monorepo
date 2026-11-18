import { Psbt, address as btcAddress, networks } from 'bitcoinjs-lib';

type UTXO = {
  txid: string;
  vout: number;
  value: number;
};

const DUST_THRESHOLD = 546n; // standard relay dust limit for P2PKH
const DEFAULT_FEE_RATE_SAT_VB = 10; // fallback fee rate when no estimator is used
const AVERAGE_INPUT_VBYTES = 68; // approximate P2WPKH/P2WSH input weight
const AVERAGE_OUTPUT_VBYTES = 31; // approximate P2WPKH output weight

const BLOCKSTREAM_API_URL = 'https://blockstream.info/api';

/**
 * Fetch a fee rate (sat/vB) from Blockstream; fallback to DEFAULT_FEE_RATE_SAT_VB on error.
 *
 * @param targetBlocks - The number of blocks to target for the fee rate
 * @returns - The fee rate in sat
 */
async function fetchFeeRate(targetBlocks = 3): Promise<number> {
  try {
    const res = await fetch(`${BLOCKSTREAM_API_URL}/fee-estimates`);
    if (!res.ok) {
      throw new Error(`fee-estimates ${res.status}`);
    }

    const data = await res.json();
    const rate = data?.[targetBlocks];

    if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
      return rate;
    }
  } catch (error) {
    console.warn('Falling back to default fee rate:', error);
  }
  return DEFAULT_FEE_RATE_SAT_VB;
}

/**
 * Detect Bitcoin network from address format
 *
 * @param address - The Bitcoin address to detect the network from
 * @returns - The network the address is on, or null if the network cannot be detected
 */
function detectNetworkFromAddress(
  address: string,
): 'bitcoin:mainnet' | 'bitcoin:testnet' | null {
  try {
    btcAddress.toOutputScript(address, networks.bitcoin);
    return 'bitcoin:mainnet';
  } catch {
    // ignore
  }

  try {
    btcAddress.toOutputScript(address, networks.testnet);
    return 'bitcoin:testnet';
  } catch {
    // ignore
  }

  return null;
}

/**
 *
 * @param address - The Bitcoin address to fetch the UTXOs for
 * @returns - The UTXOs for the address
 */
async function fetchUTXOs(address: string): Promise<UTXO[]> {
  try {
    const response = await fetch(
      `${BLOCKSTREAM_API_URL}/address/${address}/utxo`,
    );

    if (!response.ok) {
      const errorText = await response.text();

      // Provide helpful error message for network mismatch
      if (response.status === 400 && errorText.includes('invalid network')) {
        const detectedNetwork = detectNetworkFromAddress(address);
        throw new Error(
          `Network mismatch: Address ${address} appears to be on ${detectedNetwork}. Please switch the network in the app settings.`,
        );
      }

      throw new Error(
        `Failed to fetch UTXOs: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const utxos = await response.json();

    // Blockstream API returns an array of UTXOs directly
    if (!Array.isArray(utxos)) {
      throw new Error(`Unexpected response format: ${JSON.stringify(utxos)}`);
    }

    return utxos.map((utxo: any) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value,
    }));
  } catch (error) {
    throw new Error(
      `Error fetching UTXOs: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Estimate transaction fee based on transaction size
 *
 * @param inputCount - The number of inputs in the transaction
 * @param outputCount - The number of outputs in the transaction
 * @param feeRate - The fee rate in sat
 * @returns - The estimated fee in sat
 */
function estimateFee(
  inputCount: number,
  outputCount: number,
  feeRate: number = DEFAULT_FEE_RATE_SAT_VB,
): bigint {
  // Base transaction size: ~10 vbytes, P2WPKH inputs ~68 vbytes, outputs ~31 vbytes
  const estimatedVBytes =
    10 +
    inputCount * AVERAGE_INPUT_VBYTES +
    outputCount * AVERAGE_OUTPUT_VBYTES;
  return BigInt(Math.ceil(estimatedVBytes * feeRate));
}

/**
 * Select UTXOs for a transaction account for fee
 *
 * @param utxos - The UTXOs to select from
 * @param amountSats - The amount of satoshis to send
 * @param feeSats - The fee in satoshis
 * @returns - The selected UTXOs
 */
function selectUTXOs(
  utxos: UTXO[],
  amountSats: bigint,
  feeSats: bigint,
): UTXO[] {
  const totalNeeded = amountSats + feeSats;
  let totalSelected = 0n;
  const selected: UTXO[] = [];

  // Sort UTXOs by value (largest first) for better efficiency
  const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);

  for (const utxo of sortedUtxos) {
    selected.push(utxo);
    totalSelected += BigInt(utxo.value);
    if (totalSelected >= totalNeeded) {
      break;
    }
  }

  if (totalSelected < totalNeeded) {
    throw new Error('Insufficient funds');
  }

  return selected;
}

/**
 * Convert a hex string to a Uint8Array
 *
 * @param hexString - The hex string to convert
 * @returns - The Uint8Array
 */
function hexToBytes(hexString: string): Uint8Array {
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(hexString.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }

  return bytes;
}

/**
 * Build a PSBT for a Bitcoin transaction
 *
 * @param senderAddress - The Bitcoin address of the sender
 * @param recipientAddress - The Bitcoin address of the recipient
 * @param amountSats - The amount of satoshis to send
 * @returns - The PSBT for the transaction
 */
export async function buildPSBT(
  senderAddress: string,
  recipientAddress: string,
  amountSats: bigint,
): Promise<{ psbt: Uint8Array; inputCount: number }> {
  // Fetch UTXOs
  const utxos = await fetchUTXOs(senderAddress);

  if (utxos.length === 0) {
    throw new Error('No UTXOs found for sender address');
  }

  const feeRate = await fetchFeeRate();

  // Select UTXOs with iterative fee refinement to avoid negative change
  let feeEstimate = estimateFee(1, 2, feeRate); // start with 1 input, 2 outputs (recipient + change)
  let selectedUtxos: UTXO[] = [];
  let totalInputValue = 0n;
  let actualFee = 0n;
  let changeAmount = 0n;

  while (true) {
    selectedUtxos = selectUTXOs(utxos, amountSats, feeEstimate);
    totalInputValue = selectedUtxos.reduce(
      (sum, utxo) => sum + BigInt(utxo.value),
      0n,
    );
    actualFee = estimateFee(selectedUtxos.length, 2, feeRate);

    if (totalInputValue < amountSats + actualFee) {
      // Not enough once the true fee is known; increase estimate and try again
      feeEstimate = actualFee;
      continue;
    }

    changeAmount = totalInputValue - amountSats - actualFee;
    break;
  }

  if (changeAmount < 0n) {
    throw new Error('Insufficient funds after fee calculation');
  }

  // Avoid creating dust change; fold small change into the fee
  if (changeAmount > 0n && changeAmount < DUST_THRESHOLD) {
    actualFee += changeAmount;
    changeAmount = 0n;
  }

  // Create PSBT
  const psbt = new Psbt({ network: networks.bitcoin });

  // Fetch transaction data for each UTXO to get the full transaction hex
  for (const utxo of selectedUtxos) {
    const txHexResponse = await fetch(
      `${BLOCKSTREAM_API_URL}/tx/${utxo.txid}/hex`,
    );
    if (!txHexResponse.ok) {
      throw new Error(`Failed to fetch transaction hex for ${utxo.txid}`);
    }
    const txHex = await txHexResponse.text();
    const txBuffer = hexToBytes(txHex);

    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: txBuffer,
    });
  }

  // Add recipient output
  psbt.addOutput({
    address: recipientAddress,
    value: amountSats,
  });

  // Add change output (if any)
  if (changeAmount > 0n) {
    psbt.addOutput({
      address: senderAddress,
      value: changeAmount,
    });
  }

  // Convert PSBT to Uint8Array
  const psbtBytes = psbt.toBuffer();
  const psbtUint8Array = new Uint8Array(psbtBytes);

  return {
    psbt: psbtUint8Array,
    inputCount: selectedUtxos.length,
  };
}
