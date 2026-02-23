/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
// These imports resolve to mocks via vitest.config.ts aliases
import { createMultichainClient } from '@metamask/connect-multichain';
import {
  getWalletStandard,
  registerSolanaWalletStandard,
} from '@metamask/solana-wallet-standard';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createSolanaClient } from './connect';
import type { SolanaConnectOptions } from './types';

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
    provider: {},
    disconnect: vi.fn().mockResolvedValue(undefined),
  };

  const mockWallet = {
    name: 'MetaMask',
    version: '1.0.0',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createMultichainClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCore,
    );
    (getWalletStandard as ReturnType<typeof vi.fn>).mockReturnValue(mockWallet);
    (
      registerSolanaWalletStandard as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);
  });

  afterEach(() => {
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
    });
  });

  it('should return core instance from createMultichainClient', async () => {
    const client = await createSolanaClient(mockOptions);

    expect(client.core).toBe(mockCore);
  });

  describe('auto-registration', () => {
    it('should auto-register the wallet by default', async () => {
      await createSolanaClient(mockOptions);

      expect(registerSolanaWalletStandard).toHaveBeenCalledWith({
        client: mockCore.provider,
        walletName: 'MetaMask Connect',
      });
    });

    it('should skip auto-registration when skipAutoRegister is true', async () => {
      await createSolanaClient({ ...mockOptions, skipAutoRegister: true });

      expect(registerSolanaWalletStandard).not.toHaveBeenCalled();
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
          walletName: 'MetaMask Connect',
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
          walletName: 'MetaMask Connect',
        });
      });

      it('should no-op when auto-registration was used', async () => {
        const client = await createSolanaClient(mockOptions);

        vi.clearAllMocks();
        await client.registerWallet();

        expect(registerSolanaWalletStandard).not.toHaveBeenCalled();
      });
    });

    describe('disconnect', () => {
      it('should disconnect using core.disconnect', async () => {
        const client = await createSolanaClient(mockOptions);

        await client.disconnect();

        expect(mockCore.disconnect).toHaveBeenCalled();
      });
    });
  });
});
