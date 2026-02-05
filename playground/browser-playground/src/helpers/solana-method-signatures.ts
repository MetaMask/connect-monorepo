/* eslint-disable @typescript-eslint/explicit-function-return-type -- Demo helpers */
/* eslint-disable no-restricted-globals -- Browser playground uses process.env */

import {
  getConfig,
  stringToBase64,
  uint8ArrayToBase64,
  getHostname,
} from '@metamask/playground-ui/config';
import { FEATURED_NETWORKS } from '@metamask/playground-ui/constants';
import type { Commitment } from '@solana/web3.js';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

const getSolanaRpcConfig = () => {
  const config = getConfig();
  return {
    endpoints: [
      ...(config.heliusApiKey
        ? [`https://api.helius-rpc.com/?api-key=${config.heliusApiKey}`]
        : []),
      // Fallback: check environment variable directly (for backwards compatibility)
      ...(process.env.REACT_APP_HELIUS_API_KEY
        ? [
            `https://api.helius-rpc.com/?api-key=${process.env.REACT_APP_HELIUS_API_KEY}`,
          ]
        : []),
      'https://api.devnet.solana.com',
      'https://api.mainnet-beta.solana.com',
    ],
    commitment: 'confirmed' as Commitment,
    fallbackBlockhash: 'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k',
  };
};

const generateBase64Transaction = async (address: string) => {
  const rpcConfig = getSolanaRpcConfig();
  const publicKey = new PublicKey(address);
  let blockhash: string | undefined;
  let error: unknown;

  for (const endpoint of rpcConfig.endpoints) {
    try {
      const connection = new Connection(endpoint, rpcConfig.commitment);
      const response = await connection.getLatestBlockhash();
      blockhash = response.blockhash;
      console.log(`Successfully connected to Solana RPC endpoint`);
      break;
    } catch (connectionError) {
      console.error(`Failed to connect to RPC endpoint:`, connectionError);
      error = connectionError;
    }
  }

  if (!blockhash) {
    console.warn('All RPC endpoints failed, using fallback blockhash');
    blockhash = rpcConfig.fallbackBlockhash;
    console.error('Original error:', error);
  }

  const transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = publicKey;

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: publicKey,
      lamports: 1000,
    }),
  );

  const serializedTransaction = transaction.serialize({
    verifySignatures: false,
  });

  // Convert Uint8Array to base64 using the platform adapter
  const base64Transaction = uint8ArrayToBase64(
    new Uint8Array(serializedTransaction),
  );

  return base64Transaction;
};

/**
 * Generates example parameters for Solana methods.
 *
 * @param method - The Solana method name
 * @param address - The Solana address to use in the examples
 * @returns The example parameters for the method
 */
export const generateSolanaMethodExamples = async (
  method: string,
  address: string,
) => {
  switch (method) {
    case 'signMessage':
      return {
        params: {
          account: { address },
          message: stringToBase64('Hello, world!'),
        },
      };
    case 'signTransaction':
      return {
        params: {
          account: { address },
          transaction: await generateBase64Transaction(address),
          scope: FEATURED_NETWORKS['Solana Mainnet'],
        },
      };
    case 'signAllTransactions':
      return {
        params: {
          account: { address },
          transactions: [
            await generateBase64Transaction(address),
            await generateBase64Transaction(address),
          ],
          scope: FEATURED_NETWORKS['Solana Mainnet'],
        },
      };
    case 'signAndSendTransaction':
      return {
        params: {
          account: { address },
          transaction: await generateBase64Transaction(address),
          scope: FEATURED_NETWORKS['Solana Mainnet'],
        },
      };
    case 'signIn':
      return {
        params: {
          address,
          domain: getHostname(),
          statement: 'Please sign in.',
        },
      };
    case 'getGenesisHash':
      return {
        params: {},
      };
    default:
      return {};
  }
};
