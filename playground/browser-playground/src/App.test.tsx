import { render, screen } from '@testing-library/react';
import { TEST_IDS } from '@metamask/playground-ui';

import App from './App';

jest.mock('./sdk', () => ({
  useSDK: () => ({
    error: null,
    status: 'loaded',
    session: undefined,
    connect: jest.fn(),
    disconnect: jest.fn(),
    invokeMethod: jest.fn(),
  }),
}));

jest.mock('./sdk/LegacyEVMSDKProvider', () => ({
  useLegacyEVMSDK: () => ({
    connected: false,
    provider: undefined,
    chainId: undefined,
    accounts: [],
    sdk: undefined,
    error: null,
    connect: jest.fn(),
    connectAndSign: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

jest.mock('./sdk/SolanaProvider', () => ({
  useSolanaSDK: () => ({
    walletError: null,
    clearWalletError: jest.fn(),
  }),
}));

jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: false,
    connecting: false,
    disconnecting: false,
    publicKey: null,
    wallets: [],
    select: jest.fn(),
  }),
}));

jest.mock('./components/ScopeCard', () => ({
  ScopeCard: () => null,
}));

jest.mock('./components/LegacyEVMCard', () => ({
  LegacyEVMCard: () => null,
}));

jest.mock('./components/WagmiCard', () => ({
  WagmiCard: () => null,
}));

jest.mock('./components/SolanaWalletCard', () => ({
  SolanaWalletCard: () => null,
}));

jest.mock('wagmi', () => ({
  useBalance: () => ({ data: undefined }),
  useBlockNumber: () => ({ data: undefined }),
  useChainId: () => 1,
  useChains: () => [],
  useConnect: () => ({
    connectors: [],
    connectAsync: jest.fn(),
    status: 'idle',
  }),
  useConnection: () => ({
    address: undefined,
    isConnected: false,
  }),
  useConnectorClient: () => ({ data: undefined }),
  useDisconnect: () => ({ disconnect: jest.fn() }),
  useSendTransaction: () => ({
    data: undefined,
    error: null,
    isPending: false,
    sendTransaction: jest.fn(),
  }),
  useSignMessage: () => ({
    data: undefined,
    signMessage: jest.fn(),
  }),
  useSwitchChain: () => ({ switchChain: jest.fn() }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
  }),
}));

test('renders the playground title and EIP-6963 test bench', () => {
  render(<App />);

  expect(screen.getByText(/MetaMask MultiChain/iu)).toBeInTheDocument();
  expect(screen.getByTestId(TEST_IDS.eip6963.section)).toBeInTheDocument();
});
