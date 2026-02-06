/* eslint-disable @typescript-eslint/explicit-function-return-type -- Interactive CLI demo */

import type { SessionData } from '@metamask/connect-multichain';
import {
  createSolanaClient,
  type SolanaClient,
} from '@metamask/connect-solana';

/**
 * Solana CAIP-2 chain IDs for supported networks.
 */
export const SOLANA_CHAINS = {
  mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
} as const;

/**
 * Default Solana RPC endpoints.
 */
const SOLANA_RPC_URLS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

/**
 * Callbacks for Solana client state changes.
 */
export type SolanaEventCallbacks = {
  onConnect: (accounts: { [chainId: string]: string[] }) => void;
  onDisconnect: () => void;
};

/**
 * Initializes the Solana client with default configuration.
 *
 * @returns Promise resolving to the initialized SolanaClient
 */
export async function initSolanaClient(): Promise<SolanaClient> {
  const client = await createSolanaClient({
    dapp: {
      name: 'Node.js Playground',
      url: 'https://playground.metamask.io',
    },
    api: {
      supportedNetworks: SOLANA_RPC_URLS,
    },
  });

  return client;
}

/**
 * Sets up event handlers for the Solana client to track session state.
 *
 * @param client - The Solana client instance
 * @param callbacks - Callbacks to invoke on state changes
 */
export function setupSolanaEventHandlers(
  client: SolanaClient,
  callbacks: SolanaEventCallbacks,
) {
  client.core.on('wallet_sessionChanged', (session?: SessionData) => {
    if (session?.sessionScopes) {
      const groupedAccounts: { [chainId: string]: string[] } = {};

      // Only track Solana accounts
      for (const scope of Object.values(session.sessionScopes) as {
        accounts?: string[];
      }[]) {
        if (scope.accounts) {
          for (const acc of scope.accounts) {
            // Only include Solana accounts (starts with 'solana:')
            if (acc.startsWith('solana:')) {
              const [namespace, reference] = acc.split(':');
              const chainId = `${namespace}:${reference}`;
              if (!groupedAccounts[chainId]) {
                groupedAccounts[chainId] = [];
              }
              groupedAccounts[chainId].push(acc);
            }
          }
        }
      }

      // Only call onConnect if we have Solana accounts
      if (Object.keys(groupedAccounts).length > 0) {
        callbacks.onConnect(groupedAccounts);
      }
    } else {
      callbacks.onDisconnect();
    }
  });
}

/**
 * Connects to MetaMask requesting Solana mainnet access.
 *
 * @param client - The Solana client instance
 */
export async function connectSolana(client: SolanaClient): Promise<void> {
  await client.core.connect([SOLANA_CHAINS.mainnet], []);
}

/**
 * Signs a message using the Solana signMessage method.
 *
 * @param client - The Solana client instance
 * @param accountAddress - The Solana account address to sign with
 * @param message - The message to sign (will be base64 encoded)
 * @returns The signature result from the wallet
 */
export async function signSolanaMessage(
  client: SolanaClient,
  accountAddress: string,
  message: string,
): Promise<unknown> {
  // eslint-disable-next-line no-restricted-globals -- Node.js Buffer is available in Node.js environment
  const messageBase64 = Buffer.from(message, 'utf8').toString('base64');

  const result = await client.core.invokeMethod({
    scope: SOLANA_CHAINS.mainnet,
    request: {
      method: 'signMessage',
      params: {
        account: { address: accountAddress },
        message: messageBase64,
      },
    },
  });

  return result;
}

/**
 * Disconnects the Solana client and revokes the session.
 *
 * @param client - The Solana client instance
 */
export async function disconnectSolana(client: SolanaClient): Promise<void> {
  await client.disconnect();
}
