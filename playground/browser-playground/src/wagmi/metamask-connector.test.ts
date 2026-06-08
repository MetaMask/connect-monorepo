import { createEVMClient } from '@metamask/connect-evm';
import { createConnector } from '@wagmi/core';
import { getAddress, numberToHex, withRetry, withTimeout } from 'viem';

import { metaMask } from './metamask-connector';

jest.mock('@metamask/connect-evm', () => ({
  createEVMClient: jest.fn(),
}));

jest.mock('@wagmi/core', () => ({
  ChainNotConfiguredError: class ChainNotConfiguredError extends Error {},
  createConnector: jest.fn(),
}));

jest.mock('viem', () => ({
  getAddress: jest.fn((address: string) => address),
  numberToHex: jest.fn((value: number) => `0x${value.toString(16)}`),
  ResourceUnavailableRpcError: class ResourceUnavailableRpcError extends Error {
    static code = -32002;
  },
  SwitchChainError: class SwitchChainError extends Error {},
  UserRejectedRequestError: class UserRejectedRequestError extends Error {
    static code = 4001;
  },
  withRetry: jest.fn(async (fn: () => Promise<unknown>) => fn()),
  withTimeout: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));

describe('metaMask wagmi connector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createEVMClient as jest.Mock).mockResolvedValue({
      accounts: [],
      getChainId: jest.fn(),
      getProvider: jest.fn(),
    });
    (createConnector as jest.Mock).mockImplementation((setup) =>
      setup({
        chains: [
          {
            id: 1,
            rpcUrls: {
              default: {
                http: ['https://mainnet.example'],
              },
            },
          },
        ],
        emitter: {
          emit: jest.fn(),
        },
      }),
    );
    (getAddress as jest.Mock).mockImplementation((address: string) => address);
    (numberToHex as jest.Mock).mockImplementation(
      (value: number) => `0x${value.toString(16)}`,
    );
    (withRetry as jest.Mock).mockImplementation(
      async (fn: () => Promise<unknown>) => fn(),
    );
    (withTimeout as jest.Mock).mockImplementation(
      async (fn: () => Promise<unknown>) => fn(),
    );
  });

  it('opts wagmi-managed SDK clients out of automatic EIP-6963 announcement by default', async () => {
    const connector = metaMask() as unknown as {
      getInstance: () => Promise<unknown>;
    };

    await connector.getInstance();

    expect(createEVMClient).toHaveBeenCalledWith(
      expect.objectContaining({
        skipAutoAnnounce: true,
      }),
    );
  });
});
