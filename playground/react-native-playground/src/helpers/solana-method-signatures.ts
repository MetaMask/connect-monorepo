import { Transaction, PublicKey, SystemProgram, Connection } from '@solana/web3.js';
import type { Commitment } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { FEATURED_NETWORKS } from '@metamask/playground-ui/constants';
import { getConfig } from '@metamask/playground-ui/config';

const getSolanaRpcConfig = () => {
  const config = getConfig();
  return {
    endpoints: [
      ...(config.heliusApiKey
        ? [`https://api.helius-rpc.com/?api-key=${config.heliusApiKey}`]
        : []),
      // Fallback: check environment variable directly (for backwards compatibility)
      ...(process.env.EXPO_PUBLIC_HELIUS_API_KEY
        ? [
            `https://api.helius-rpc.com/?api-key=${process.env.EXPO_PUBLIC_HELIUS_API_KEY}`,
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

  // React Native uses Buffer for base64 encoding
  const base64Transaction = Buffer.from(serializedTransaction).toString('base64');

  return base64Transaction;
};

/**
 * Converts a string to base64 for React Native.
 * Uses Buffer which is available in React Native via the buffer polyfill.
 */
const stringToBase64 = (str: string): string => {
  const buffer = Buffer.from(str, 'utf8');
  return buffer.toString('base64');
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
          // React Native doesn't have window.location, use a default domain
          domain: 'metamask.io',
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
