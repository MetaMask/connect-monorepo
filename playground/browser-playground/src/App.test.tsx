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
  useConnect: () => ({
    connectors: [],
    connectAsync: jest.fn(),
    status: 'idle',
  }),
  useConnection: () => ({
    address: undefined,
    isConnected: false,
  }),
}));

test('renders the playground title and EIP-6963 test bench', () => {
  render(<App />);

  expect(screen.getByText(/MetaMask MultiChain/iu)).toBeInTheDocument();
  const eip6963Section = screen.getByTestId(TEST_IDS.eip6963.section);
  expect(eip6963Section).toBeInTheDocument();
  expect(eip6963Section.parentElement).toHaveClass('mb-6');
});
