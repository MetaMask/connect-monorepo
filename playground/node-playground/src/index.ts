/* eslint-disable @typescript-eslint/explicit-function-return-type -- Interactive CLI demo */
/* eslint-disable no-restricted-globals -- Node.js playground uses process */
/* eslint-disable require-atomic-updates -- Interactive CLI state updates are sequential */

/* eslint-disable import-x/no-extraneous-dependencies -- Playground dependencies */
/* eslint-disable import-x/no-named-as-default-member -- Library APIs */
/* eslint-disable @typescript-eslint/no-use-before-define -- Function hoisting in CLI */
/* eslint-disable guard-for-in -- CLI demo iteration */

import {
  createEVMClient,
  type MetamaskConnectEVM,
} from '@metamask/connect-evm';
import {
  createMultichainClient,
  getInfuraRpcUrls,
  type SessionData,
} from '@metamask/connect-multichain';
import type { SolanaClient } from '@metamask/connect-solana';
import { hexToNumber, type Hex } from '@metamask/utils';
import chalk from 'chalk';
import dotenv from 'dotenv';
import inquirer from 'inquirer';
import ora, { type Ora } from 'ora';

import {
  initSolanaClient,
  setupSolanaEventHandlers,
  connectSolana,
  signSolanaMessage,
  disconnectSolana,
  SOLANA_CHAINS,
} from './solana';

dotenv.config();

// Define the states our application can be in
type AppState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'SIGNING';
type ConnectorType = 'multichain' | 'evm' | 'solana';

const AVAILABLE_CHAINS = [
  { id: 1, hexId: '0x1' as Hex, name: 'Ethereum Mainnet', caip: 'eip155:1' },
  { id: 137, hexId: '0x89' as Hex, name: 'Polygon', caip: 'eip155:137' },
  { id: 59144, hexId: '0xe708' as Hex, name: 'Linea', caip: 'eip155:59144' },
  {
    id: 11155111,
    hexId: '0xaa36a7' as Hex,
    name: 'Sepolia Testnet',
    caip: 'eip155:11155111',
  },
] as const;

/**
 * Converts CAIP-2 keyed RPC URLs map to hex-keyed format.
 * Example: { 'eip155:1': 'url' } -> { '0x1': 'url' }
 *
 * @param caipMap - A map of CAIP-2 chain IDs to RPC URLs
 * @returns A map of hex chain IDs to RPC URLs
 */
function convertCaipToHexKeys(
  caipMap: Record<string, string>,
): Record<Hex, string> {
  return Object.entries(caipMap).reduce<Record<Hex, string>>(
    (acc, [caipChainId, url]) => {
      // Extract the numeric part from CAIP-2 format (e.g., 'eip155:1' -> 1)
      const match = caipChainId.match(/^eip155:(\d+)$/u);
      if (match?.[1]) {
        const decimalChainId = parseInt(match[1], 10);
        const hexChainId: Hex = `0x${decimalChainId.toString(16)}`;
        acc[hexChainId] = url;
      }
      return acc;
    },
    {},
  );
}

// Store our application state in a simple object
const state: {
  app: AppState;
  connectorType: ConnectorType | null;
  metamaskConnectMultichain: Awaited<
    ReturnType<typeof createMultichainClient>
  > | null;
  evmSdk: MetamaskConnectEVM | null;
  solanaClient: SolanaClient | null;
  accounts: { [chainId: string]: string[] }; // Group accounts by chain
  spinner: Ora | null;
} = {
  app: 'DISCONNECTED',
  connectorType: null,
  metamaskConnectMultichain: null,
  evmSdk: null,
  solanaClient: null,
  accounts: {}, // Initialize as an empty object
  spinner: null,
};

/**
 * Renders the main menu and handles user input.
 */
const showMenu = async () => {
  // Don't show the menu if we are in a transient state
  if (state.app === 'CONNECTING' || state.app === 'SIGNING') {
    return;
  }

  if (state.app === 'DISCONNECTED') {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'You are disconnected. What would you like to do?',
        choices: [
          'Connect with Multichain API',
          'Connect with Legacy EVM Connector',
          'Connect with Solana Client',
          'Exit',
        ],
      },
    ]);
    if (action === 'Connect with Multichain API') {
      state.connectorType = 'multichain';
      await handleConnect();
    } else if (action === 'Connect with Legacy EVM Connector') {
      state.connectorType = 'evm';
      await handleConnect();
    } else if (action === 'Connect with Solana Client') {
      state.connectorType = 'solana';
      await handleConnect();
    } else {
      process.exit(0);
    }
  } else if (state.app === 'CONNECTED') {
    console.log(chalk.green('✓ Connected!'));

    // Display current chain for EVM connector
    if (state.connectorType === 'evm' && state.evmSdk?.selectedChainId) {
      const currentChainId = parseInt(state.evmSdk.selectedChainId, 16);
      const currentChain = AVAILABLE_CHAINS.find(
        (chain) => chain.id === currentChainId,
      );
      if (currentChain) {
        console.log(
          chalk.bold(`Current Chain: ${chalk.cyan(currentChain.name)}`),
        );
      }
    }

    console.log(chalk.bold('Accounts:'));
    for (const chainId in state.accounts) {
      console.log(
        `  ${chalk.cyan(chainId)}: ${state.accounts[chainId].join(', ')}`,
      );
    }

    // Build menu choices based on connector type
    let choices: string[];

    if (state.connectorType === 'solana') {
      // Solana connector: only Solana signing and disconnect
      choices = ['Sign Solana Message', 'Disconnect'];
    } else {
      choices = ['Sign Ethereum Message', 'Disconnect'];

      // Only show Solana signing option for multichain connector
      if (state.connectorType === 'multichain') {
        choices.splice(1, 0, 'Sign Solana Message');
      }

      // Only show Switch Chain option for EVM connector
      if (state.connectorType === 'evm') {
        choices.splice(1, 0, 'Switch Chain');
      }
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do next?',
        choices,
      },
    ]);

    if (action === 'Sign Ethereum Message') {
      await handleEthereumSign();
    } else if (action === 'Sign Solana Message') {
      await handleSolanaSign();
    } else if (action === 'Switch Chain') {
      await handleSwitchChain();
    } else if (action === 'Disconnect') {
      await handleDisconnect();
    }
  }
};

// --- Action Handlers ---

const handleConnect = async () => {
  state.app = 'CONNECTING';
  state.spinner = ora(
    'Connecting... Scan the QR code with your MetaMask Mobile app.',
  ).start();

  try {
    if (state.connectorType === 'multichain') {
      // Requesting accounts for Ethereum Mainnet and Solana Mainnet
      await state.metamaskConnectMultichain?.connect(
        ['eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
        [],
      );
    } else if (state.connectorType === 'evm') {
      // Connect using EVM connector (Ethereum Mainnet only)
      await state.evmSdk?.connect({ chainIds: ['0x1'] });
    } else if (state.connectorType === 'solana') {
      // Connect using Solana connector (Solana Mainnet only)
      if (state.solanaClient) {
        await connectSolana(state.solanaClient);
      }
    }
  } catch (error: unknown) {
    if (state.spinner) {
      state.spinner.fail('Connection failed or was cancelled.');
      state.spinner = null;
    } else {
      console.error(
        chalk.red('Connection failed or was cancelled.'),
        error instanceof Error ? error.message : String(error),
      );
    }
    state.app = 'DISCONNECTED'; // Revert state
    state.connectorType = null;
  }
};

const handleDisconnect = async () => {
  state.spinner = ora('Disconnecting...').start();
  try {
    if (state.connectorType === 'multichain') {
      await state.metamaskConnectMultichain?.disconnect();
    } else if (state.connectorType === 'evm') {
      await state.evmSdk?.disconnect();
    } else if (state.connectorType === 'solana') {
      if (state.solanaClient) {
        await disconnectSolana(state.solanaClient);
      }
    }
    state.spinner.succeed('Disconnected successfully.');
  } catch (error: unknown) {
    state.spinner.fail('Failed to disconnect.');
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error)),
    );
  } finally {
    // The event handlers will handle the state transition
    state.spinner = null;
  }
};

const handleEthereumSign = async () => {
  const chain = 'eip155:1';
  if (!state.accounts[chain] || state.accounts[chain].length === 0) {
    console.log(chalk.red('No Ethereum account connected.'));
    return;
  }
  const accountAddress = state.accounts[chain][0].split(':')[2];

  const { message } = await inquirer.prompt([
    {
      type: 'input',
      name: 'message',
      message: 'Enter the message for Ethereum personal_sign:',
      default: 'Hello from the Ethereum world!',
    },
  ]);

  const messageHex = `0x${Buffer.from(message, 'utf8').toString('hex')}`;

  state.app = 'SIGNING';
  state.spinner = ora(
    'Waiting for Ethereum signature... Please check your MetaMask Mobile app.',
  ).start();

  try {
    if (state.connectorType === 'multichain') {
      const result = await state.metamaskConnectMultichain?.invokeMethod({
        scope: chain,
        request: {
          method: 'personal_sign',
          params: [messageHex, accountAddress], // CORRECT: Send only the hex address
        },
      });
      state.spinner.succeed('Ethereum message signed successfully!');
      console.log(chalk.bold('Signature:'), result);
    } else if (state.connectorType === 'evm') {
      const provider = state.evmSdk?.getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }
      const result = await provider.request({
        method: 'personal_sign',
        params: [messageHex, accountAddress],
      });
      state.spinner.succeed('Ethereum message signed successfully!');
      console.log(chalk.bold('Signature:'), result);
    }
  } catch (error: unknown) {
    state.spinner.fail('Failed to sign Ethereum message.');
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error)),
    );
  } finally {
    state.app = 'CONNECTED';
    state.spinner = null;
  }
};

const handleSwitchChain = async () => {
  if (state.connectorType !== 'evm' || !state.evmSdk) {
    console.log(
      chalk.red('Switch chain is only available with Legacy EVM Connector.'),
    );
    return;
  }

  const currentChainId = state.evmSdk.selectedChainId
    ? parseInt(state.evmSdk.selectedChainId, 16)
    : null;

  // Filter out current chain from choices
  const availableChains = AVAILABLE_CHAINS.filter(
    (chain) => chain.id !== currentChainId,
  );

  if (availableChains.length === 0) {
    console.log(chalk.yellow('No other chains available to switch to.'));
    return;
  }

  const { chain } = await inquirer.prompt([
    {
      type: 'list',
      name: 'chain',
      message: 'Select a chain to switch to:',
      choices: availableChains.map((chainOption) => ({
        name: chainOption.name,
        value: chainOption.hexId,
      })),
    },
  ]);

  state.spinner = ora(
    'Switching chain... Please check your MetaMask Mobile app.',
  ).start();

  try {
    await state.evmSdk.switchChain({ chainId: chain });
    const chainName =
      AVAILABLE_CHAINS.find((chainOption) => chainOption.hexId === chain)
        ?.name ?? 'chain';
    state.spinner.succeed(`Successfully switched to ${chainName}.`);
  } catch (error: unknown) {
    state.spinner.fail('Failed to switch chain.');
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error)),
    );
  } finally {
    state.spinner = null;
  }
};

const handleSolanaSign = async () => {
  const chain = SOLANA_CHAINS.mainnet;
  if (!state.accounts[chain] || state.accounts[chain].length === 0) {
    console.log(chalk.red('No Solana account connected.'));
    return;
  }

  // Solana signing is only available with multichain or solana connector
  if (
    state.connectorType !== 'multichain' &&
    state.connectorType !== 'solana'
  ) {
    console.log(
      chalk.red(
        'Solana signing is only available with Multichain API or Solana connector.',
      ),
    );
    return;
  }

  const accountAddress = state.accounts[chain][0].split(':')[2]; // Extract address from CAIP format

  const { message } = await inquirer.prompt([
    {
      type: 'input',
      name: 'message',
      message: 'Enter the message for Solana signMessage:',
      default: 'Hello from the Solana world!',
    },
  ]);

  state.app = 'SIGNING';
  state.spinner = ora(
    'Waiting for Solana signature... Please check your MetaMask Mobile app.',
  ).start();

  try {
    let result: unknown;

    if (state.connectorType === 'solana' && state.solanaClient) {
      // Use the Solana client module
      result = await signSolanaMessage(
        state.solanaClient,
        accountAddress,
        message,
      );
    } else {
      // Use the multichain client
      const messageBase64 = Buffer.from(message, 'utf8').toString('base64');
      result = await state.metamaskConnectMultichain?.invokeMethod({
        scope: chain,
        request: {
          method: 'signMessage',
          params: {
            account: { address: accountAddress },
            message: messageBase64,
          },
        },
      });
    }

    state.spinner.succeed('Solana message signed successfully!');
    console.log(chalk.bold('Signature:'), result);
  } catch (error: unknown) {
    state.spinner.fail('Failed to sign Solana message.');
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error)),
    );
  } finally {
    state.app = 'CONNECTED';
    state.spinner = null;
  }
};

/**
 * Main application function.
 */
const main = async (): Promise<void> => {
  console.clear();
  console.log(chalk.bold.cyan('MetaMask SDK Node.js Playground'));
  console.log('------------------------------------');

  const infuraApiKey = process.env.INFURA_API_KEY ?? 'demo';
  const supportedNetworks = getInfuraRpcUrls(infuraApiKey);
  // Convert CAIP-keyed RPC URLs to hex-keyed format for EVM SDK
  const hexKeyedNetworks = convertCaipToHexKeys(supportedNetworks);

  // Initialize Multichain SDK
  state.metamaskConnectMultichain = await createMultichainClient({
    dapp: {
      name: 'Node.js Playground',
      url: 'https://playground.metamask.io',
    },
    api: {
      supportedNetworks,
    },
  });

  // Initialize EVM SDK
  state.evmSdk = await createEVMClient({
    dapp: {
      name: 'Node.js Playground',
      url: 'https://playground.metamask.io',
    },
    api: {
      supportedNetworks: hexKeyedNetworks,
    },
    eventHandlers: {
      connect: ({ accounts, chainId }) => {
        if (state.app !== 'CONNECTING') {
          console.clear();
          console.log(chalk.bold.cyan('MetaMask SDK Node.js Playground'));
          console.log('------------------------------------');
        }

        if (state.spinner) {
          state.spinner.stop();
          state.spinner = null;
        }

        state.connectorType = 'evm';

        // Group accounts by chain ID for EVM connector
        // chainId is a hex string, convert to number for CAIP format
        const numericChainId = hexToNumber(chainId as `0x${string}`);
        const groupedAccounts: { [chainId: string]: string[] } = {};
        const caipChainId = `eip155:${numericChainId}`;
        groupedAccounts[caipChainId] = accounts.map(
          (acc) => `${caipChainId}:${acc}`,
        );
        state.accounts = groupedAccounts;
        state.app = 'CONNECTED';
      },
      disconnect: () => {
        state.accounts = {};
        state.app = 'DISCONNECTED';
        state.connectorType = null;
        console.clear();
        console.log(chalk.bold.cyan('MetaMask SDK Node.js Playground'));
        console.log('------------------------------------');
        console.log(chalk.yellow('Session ended. You are now disconnected.'));
      },
      accountsChanged: (accounts) => {
        if (state.connectorType === 'evm' && state.evmSdk) {
          const chainId = state.evmSdk.selectedChainId;
          if (chainId) {
            const numericChainId = parseInt(chainId, 16);
            const caipChainId = `eip155:${numericChainId}`;
            const groupedAccounts: { [chainId: string]: string[] } = {};
            groupedAccounts[caipChainId] = accounts.map(
              (acc) => `${caipChainId}:${acc}`,
            );
            state.accounts = groupedAccounts;
          }
        }
      },
      chainChanged: (chainId) => {
        if (state.connectorType === 'evm' && state.evmSdk) {
          const { accounts } = state.evmSdk;
          // chainId is a hex string, convert to number for CAIP format
          const numericChainId = hexToNumber(chainId);
          const caipChainId = `eip155:${numericChainId}`;
          const groupedAccounts: { [chainId: string]: string[] } = {};
          groupedAccounts[caipChainId] = accounts.map(
            (acc) => `${caipChainId}:${acc}`,
          );
          state.accounts = groupedAccounts;
        }
      },
    },
  });

  // Initialize Solana SDK
  state.solanaClient = await initSolanaClient();

  // --- Solana SDK Event Handler ---
  setupSolanaEventHandlers(state.solanaClient, {
    onConnect: (accounts) => {
      if (state.app !== 'CONNECTING') {
        console.clear();
        console.log(chalk.bold.cyan('MetaMask SDK Node.js Playground'));
        console.log('------------------------------------');
      }

      if (state.spinner) {
        state.spinner.stop();
        state.spinner = null;
      }

      state.accounts = accounts;
      state.app = 'CONNECTED';
    },
    onDisconnect: () => {
      state.accounts = {};
      state.app = 'DISCONNECTED';
      state.connectorType = null;
      console.clear();
      console.log(chalk.bold.cyan('MetaMask SDK Node.js Playground'));
      console.log('------------------------------------');
      console.log(chalk.yellow('Session ended. You are now disconnected.'));
    },
  });

  // --- Multichain SDK Event Handler ---
  state.metamaskConnectMultichain.on(
    'wallet_sessionChanged',
    (session?: SessionData) => {
      if (state.app !== 'CONNECTING') {
        // Only clear the console if we are not in the middle of a connection flow
        console.clear();
        console.log(chalk.bold.cyan('MetaMask SDK Node.js Playground'));
        console.log('------------------------------------');
      }

      if (state.spinner && state.app === 'CONNECTING') {
        state.spinner.stop();
        state.spinner = null;
      }

      if (session?.sessionScopes) {
        const groupedAccounts: { [chainId: string]: string[] } = {};
        for (const scope of Object.values(session.sessionScopes) as {
          accounts?: string[];
        }[]) {
          if (scope.accounts) {
            for (const acc of scope.accounts) {
              const [namespace, reference] = acc.split(':');
              const chainId = `${namespace}:${reference}`;
              if (!groupedAccounts[chainId]) {
                groupedAccounts[chainId] = [];
              }
              groupedAccounts[chainId].push(acc);
            }
          }
        }
        state.accounts = groupedAccounts;
        state.app = 'CONNECTED';
      } else {
        state.accounts = {};
        state.app = 'DISCONNECTED';
        state.connectorType = null;
        console.log(chalk.yellow('Session ended. You are now disconnected.'));
      }
    },
  );

  // --- Main application loop ---

  while (true) {
    try {
      await showMenu();
    } catch (error) {
      if (state.spinner) {
        state.spinner.stop();
      }
      console.error(chalk.red('An error occurred:'), error);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

main().catch((error) => {
  if (state.spinner) {
    state.spinner.stop();
  }
  console.error(chalk.red('A critical error occurred:'), error);
  process.exit(1);
});
