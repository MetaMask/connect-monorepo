/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
// These imports resolve to mocks via vitest.config.ts aliases
import { createMultichainClient } from '@metamask/connect-multichain';
import {
  getWalletStandard,
  registerSolanaWalletStandard,
} from '@metamask/solana-wallet-standard';
import { getWallets } from '@wallet-standard/app';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createSolanaClient } from './connect';
import type { SolanaConnectOptions } from './types';

vi.mock('@wallet-standard/app', () => ({
  getWallets: vi.fn(() => ({
    get: (): [] => [],
  })),
}));

describe('createSolanaClient', () => {
  const mockOptions: SolanaConnectOptions = {
    dapp: {
      name: 'Test DApp',
      url: 'https://testdapp.com',
      iconUrl: 'https://testdapp.com/icon.png',
    },
    api: {
      supportedNetworks: {
        mainnet: 'https://api.mainnet-beta.solana.com',
      },
    },
    debug: true,
  };

  const mockCore = {
    provider: {
      getSession: vi.fn().mockResolvedValue({ sessionScopes: {} }),
    },
    disconnect: vi.fn().mockResolvedValue(undefined),
  };

  const mockConnect = vi.fn().mockResolvedValue(undefined);

  const mockWallet = {
    name: 'MetaMask',
    version: '1.0.0',
    features: {
      'standard:connect': {
        connect: mockConnect,
      },
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (createMultichainClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCore,
    );
    mockCore.provider.getSession.mockResolvedValue({ sessionScopes: {} });
    (getWalletStandard as ReturnType<typeof vi.fn>).mockReturnValue(mockWallet);
    (
      registerSolanaWalletStandard as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should create a Solana client with correct structure', async () => {
    const client = await createSolanaClient(mockOptions);

    expect(client).toHaveProperty('core');
    expect(client).toHaveProperty('getWallet');
    expect(client).toHaveProperty('registerWallet');
    expect(client).toHaveProperty('disconnect');
    expect(typeof client.getWallet).toBe('function');
    expect(typeof client.registerWallet).toBe('function');
    expect(typeof client.disconnect).toBe('function');
  });

  it('should call createMultichainClient with correct options', async () => {
    await createSolanaClient(mockOptions);

    expect(createMultichainClient).toHaveBeenCalledWith({
      dapp: mockOptions.dapp,
      api: {
        supportedNetworks: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp':
            'https://api.mainnet-beta.solana.com',
        },
      },
      analytics: { integrationType: 'direct' },
      versions: { 'connect-solana': expect.any(String) },
    });
  });

  it('should call createMultichainClient with default Solana mainnet when api is not provided', async () => {
    const optionsWithoutApi: SolanaConnectOptions = {
      dapp: {
        name: 'Test DApp',
      },
    };

    await createSolanaClient(optionsWithoutApi);

    expect(createMultichainClient).toHaveBeenCalledWith({
      dapp: optionsWithoutApi.dapp,
      api: {
        supportedNetworks: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp':
            'https://api.mainnet-beta.solana.com',
        },
      },
      analytics: { integrationType: 'direct' },
      versions: { 'connect-solana': expect.any(String) },
    });
  });

  it('should return core instance from createMultichainClient', async () => {
    const client = await createSolanaClient(mockOptions);

    expect(client.core).toBe(mockCore);
  });

  describe('auto-registration', () => {
    it('should auto-register the wallet by default', async () => {
      await createSolanaClient(mockOptions);

      await vi.advanceTimersByTimeAsync(1000);

      expect(registerSolanaWalletStandard).toHaveBeenCalledWith({
        client: mockCore.provider,
        walletName: 'MetaMask',
      });
    });

    it('should skip auto-registration when skipAutoRegister is true', async () => {
      await createSolanaClient({ ...mockOptions, skipAutoRegister: true });

      expect(registerSolanaWalletStandard).not.toHaveBeenCalled();
    });

    it('should skip auto-registration when MetaMask extension is already registered', async () => {
      (getWallets as ReturnType<typeof vi.fn>).mockReturnValue({
        get: () => [{ name: 'MetaMask' }],
      });

      await createSolanaClient(mockOptions);
      await vi.advanceTimersByTimeAsync(1000);

      expect(registerSolanaWalletStandard).not.toHaveBeenCalled();
    });
  });

  describe('session-based auto-connect', () => {
    it('should call provider connect when existing session has solana scopes', async () => {
      mockCore.provider.getSession.mockResolvedValueOnce({
        sessionScopes: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            methods: [],
            notifications: [],
          },
        },
      });

      await createSolanaClient(mockOptions);

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should not call provider connect when session has no solana scopes', async () => {
      mockCore.provider.getSession.mockResolvedValueOnce({ sessionScopes: {} });

      await createSolanaClient(mockOptions);

      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('should not call provider connect when session has only non-solana scopes', async () => {
      mockCore.provider.getSession.mockResolvedValueOnce({
        sessionScopes: {
          'eip155:1': { methods: [], notifications: [] },
        },
      });

      await createSolanaClient(mockOptions);

      expect(mockConnect).not.toHaveBeenCalled();
    });
  });

  describe('SolanaClient', () => {
    describe('getWallet', () => {
      it('should get wallet using getWalletStandard with MetaMask name', async () => {
        const client = await createSolanaClient({
          ...mockOptions,
          skipAutoRegister: true,
        });

        const wallet = client.getWallet();

        expect(getWalletStandard).toHaveBeenCalledWith({
          client: mockCore.provider,
          walletName: 'MetaMask',
        });
        expect(wallet).toBe(mockWallet);
      });
    });

    describe('registerWallet', () => {
      it('should register wallet with MetaMask name', async () => {
        const client = await createSolanaClient({
          ...mockOptions,
          skipAutoRegister: true,
        });

        await client.registerWallet();

        expect(registerSolanaWalletStandard).toHaveBeenCalledWith({
          client: mockCore.provider,
          walletName: 'MetaMask',
        });
      });

      it('should skip when auto-registration already registered successfully', async () => {
        const client = await createSolanaClient(mockOptions);
        await vi.advanceTimersByTimeAsync(1000);

        expect(registerSolanaWalletStandard).toHaveBeenCalledTimes(1);

        await client.registerWallet();

        expect(registerSolanaWalletStandard).toHaveBeenCalledTimes(1);
      });

      it('should skip registration when MetaMask extension is already registered', async () => {
        const client = await createSolanaClient({
          ...mockOptions,
          skipAutoRegister: true,
        });

        (getWallets as ReturnType<typeof vi.fn>).mockReturnValue({
          get: () => [{ name: 'MetaMask' }],
        });

        await client.registerWallet();

        expect(registerSolanaWalletStandard).not.toHaveBeenCalled();
      });
    });

    describe('disconnect', () => {
      it('should disconnect only Solana scopes', async () => {
        const client = await createSolanaClient(mockOptions);

        await client.disconnect();

        expect(mockCore.disconnect).toHaveBeenCalledWith([
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
          'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
        ]);
      });
    });
  });
});
