/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
// These imports resolve to mocks via vitest.config.ts aliases
import {
  getBitcoinWalletStandard,
  registerBitcoinWalletStandard,
} from '@metamask/bitcoin-wallet-standard';
import { createMultichainClient } from '@metamask/connect-multichain';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createBitcoinClient } from './connect';
import type { BitcoinConnectOptions } from './types';

describe('createBitcoinClient', () => {
  const mockOptions: BitcoinConnectOptions = {
    dapp: {
      name: 'Test DApp',
      url: 'https://testdapp.com',
      iconUrl: 'https://testdapp.com/icon.png',
    },
    api: {
      supportedNetworks: {
        mainnet: 'https://api.mainnet.bitcoin.com',
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
    (getBitcoinWalletStandard as ReturnType<typeof vi.fn>).mockReturnValue(
      mockWallet,
    );
    (
      registerBitcoinWalletStandard as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a bitcoin client with correct structure', async () => {
    const client = await createBitcoinClient(mockOptions);

    expect(client).toHaveProperty('core');
    expect(client).toHaveProperty('getWallet');
    expect(client).toHaveProperty('registerWallet');
    expect(client).toHaveProperty('disconnect');
    expect(typeof client.getWallet).toBe('function');
    expect(typeof client.registerWallet).toBe('function');
    expect(typeof client.disconnect).toBe('function');
  });

  it('should call createMultichainClient with correct options', async () => {
    await createBitcoinClient(mockOptions);

    expect(createMultichainClient).toHaveBeenCalledWith({
      dapp: mockOptions.dapp,
      api: {
        supportedNetworks: {
          'bip122:000000000019d6689c085ae165831e93':
            'https://api.mainnet.bitcoin.com',
        },
      },
    });
  });

  it('should call createMultichainClient with default Bitcoin mainnet when api is not provided', async () => {
    const optionsWithoutApi: BitcoinConnectOptions = {
      dapp: {
        name: 'Test DApp',
      },
    };

    await createBitcoinClient(optionsWithoutApi);

    expect(createMultichainClient).toHaveBeenCalledWith({
      dapp: optionsWithoutApi.dapp,
      api: {
        supportedNetworks: {
          'bip122:000000000019d6689c085ae165831e93':
            'https://api.mainnet.bitcoin.com',
        },
      },
    });
  });

  it('should return core instance from createMultichainClient', async () => {
    const client = await createBitcoinClient(mockOptions);

    expect(client.core).toBe(mockCore);
  });

  describe('auto-registration', () => {
    it('should auto-register the wallet by default', async () => {
      await createBitcoinClient(mockOptions);

      expect(registerBitcoinWalletStandard).toHaveBeenCalledWith({
        client: mockCore.provider,
        walletName: 'MetaMask Connect',
      });
    });

    it('should skip auto-registration when skipAutoRegister is true', async () => {
      await createBitcoinClient({ ...mockOptions, skipAutoRegister: true });

      expect(registerBitcoinWalletStandard).not.toHaveBeenCalled();
    });
  });

  describe('BitcoinClient', () => {
    describe('getWallet', () => {
      it('should get wallet using getBitcoinWalletStandard with MetaMask name', async () => {
        const client = await createBitcoinClient({
          ...mockOptions,
          skipAutoRegister: true,
        });

        const wallet = client.getWallet();

        expect(getBitcoinWalletStandard).toHaveBeenCalledWith({
          client: mockCore.provider,
          walletName: 'MetaMask Connect',
        });
        expect(wallet).toBe(mockWallet);
      });
    });

    describe('registerWallet', () => {
      it('should register wallet with MetaMask name', async () => {
        const client = await createBitcoinClient({
          ...mockOptions,
          skipAutoRegister: true,
        });

        await client.registerWallet();

        expect(registerBitcoinWalletStandard).toHaveBeenCalledWith({
          client: mockCore.provider,
          walletName: 'MetaMask Connect',
        });
      });

      it('should no-op when auto-registration was used', async () => {
        const client = await createBitcoinClient(mockOptions);

        vi.clearAllMocks();
        await client.registerWallet();

        expect(registerBitcoinWalletStandard).not.toHaveBeenCalled();
      });
    });

    describe('disconnect', () => {
      it('should disconnect using core.disconnect', async () => {
        const client = await createBitcoinClient(mockOptions);

        await client.disconnect();

        expect(mockCore.disconnect).toHaveBeenCalled();
      });
    });
  });
});
