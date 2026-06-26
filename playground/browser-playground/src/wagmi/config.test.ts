import { metaMask } from './metamask-connector';

jest.mock('wagmi', () => ({
  createConfig: jest.fn((config) => config),
  http: jest.fn(() => 'http-transport'),
}));

jest.mock('wagmi/chains', () => ({
  celo: { id: 42220 },
  localhost: { id: 1337 },
  mainnet: { id: 1 },
  optimism: { id: 10 },
  sepolia: { id: 11155111 },
}));

jest.mock('./metamask-connector', () => ({
  metaMask: jest.fn(() => 'metamask-connector'),
}));

describe('wagmiConfig', () => {
  it('opts the wagmi-managed SDK client out of automatic EIP-6963 announcement', async () => {
    await import('./config');

    expect(metaMask).toHaveBeenCalledWith(
      expect.objectContaining({
        skipAutoAnnounce: true,
      }),
    );
  });
});
