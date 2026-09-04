/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
// These imports resolve to mocks via vitest.config.ts aliases
import {
  BitcoinConnect,
  getBitcoinWalletStandard,
  registerBitcoinWalletStandard,
} from '@metamask/bitcoin-wallet-standard';
import { createMultichainClient } from '@metamask/connect-multichain';
import { getWallets } from '@wallet-standard/app';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createBitcoinClient } from './connect';
import type { BitcoinConnectOptions } from './types';

vi.mock('@wallet-standard/app', () => ({
  getWallets: vi.fn(() => ({
    get: (): [] => [],
  })),
}));

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
      [BitcoinConnect]: {
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
    (getBitcoinWalletStandard as ReturnType<typeof vi.fn>).mockReturnValue(
      mockWallet,
    );
    (
      registerBitcoinWalletStandard as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
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
      analytics: { integrationType: 'direct' },
      versions: { 'connect-bitcoin': expect.any(String) },
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
      analytics: { integrationType: 'direct' },
      versions: { 'connect-bitcoin': expect.any(String) },
    });
  });

  it('should forward analytics.enabled to createMultichainClient', async () => {
    await createBitcoinClient({
      ...mockOptions,
      analytics: { enabled: false, integrationType: 'wallet-standard' },
    });

    expect(createMultichainClient).toHaveBeenCalledWith(
      expect.objectContaining({
        analytics: { enabled: false, integrationType: 'wallet-standard' },
      }),
    );
  });

  it('should return core instance from createMultichainClient', async () => {
    const client = await createBitcoinClient(mockOptions);

    expect(client.core).toBe(mockCore);
  });

  describe('auto-registration', () => {
    it('should auto-register the wallet by default', async () => {
      await createBitcoinClient(mockOptions);

      await vi.advanceTimersByTimeAsync(1000);

      expect(registerBitcoinWalletStandard).toHaveBeenCalledWith({
        client: mockCore.provider,
        walletName: 'MetaMask Connect',
      });
    });

    it('should skip auto-registration when skipAutoRegister is true', async () => {
      await createBitcoinClient({ ...mockOptions, skipAutoRegister: true });

      expect(registerBitcoinWalletStandard).not.toHaveBeenCalled();
    });

    it('should skip auto-registration when MetaMask extension is already registered', async () => {
      (getWallets as ReturnType<typeof vi.fn>).mockReturnValue({
        get: () => [{ name: 'MetaMask' }],
      });

      await createBitcoinClient(mockOptions);
      await vi.advanceTimersByTimeAsync(1000);

      expect(registerBitcoinWalletStandard).not.toHaveBeenCalled();
    });
  });

  describe('session-based auto-connect', () => {
    it('should call provider connect when existing session has Bitcoin scopes', async () => {
      mockCore.provider.getSession.mockResolvedValueOnce({
        sessionScopes: {
          'bip122:000000000019d6689c085ae165831e93': {
            methods: [],
            notifications: [],
          },
        },
      });

      await createBitcoinClient(mockOptions);

      expect(mockConnect).toHaveBeenCalledWith({
        purposes: ['payment'],
      });
    });

    it('should not call provider connect when session has no Bitcoin scopes', async () => {
      mockCore.provider.getSession.mockResolvedValueOnce({ sessionScopes: {} });

      await createBitcoinClient(mockOptions);

      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('should not call provider connect when session has only non-Bitcoin scopes', async () => {
      mockCore.provider.getSession.mockResolvedValueOnce({
        sessionScopes: {
          'eip155:1': { methods: [], notifications: [] },
        },
      });

      await createBitcoinClient(mockOptions);

      expect(mockConnect).not.toHaveBeenCalled();
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

        await vi.advanceTimersByTimeAsync(1000);

        expect(registerBitcoinWalletStandard).toHaveBeenCalledTimes(1);

        await client.registerWallet();

        expect(registerBitcoinWalletStandard).toHaveBeenCalledTimes(1);
      });

      it('should skip registration when MetaMask extension is already registered', async () => {
        const client = await createBitcoinClient({
          ...mockOptions,
          skipAutoRegister: true,
        });

        (getWallets as ReturnType<typeof vi.fn>).mockReturnValue({
          get: () => [{ name: 'MetaMask' }],
        });

        await client.registerWallet();

        expect(registerBitcoinWalletStandard).not.toHaveBeenCalled();
      });
    });

    describe('disconnect', () => {
      it('should disconnect only Bitcoin scopes', async () => {
        const client = await createBitcoinClient(mockOptions);

        await client.disconnect();

        expect(mockCore.disconnect).toHaveBeenCalledWith([
          'bip122:000000000019d6689c085ae165831e93',
          'bip122:000000000933ea01ad0ee984209779ba',
          'bip122:regtest',
        ]);
      });
    });
  });
});

describe('createBitcoinClient multichain peer version check', () => {
  const baseOptions: BitcoinConnectOptions = {
    dapp: { name: 'Test DApp', url: 'https://testdapp.com' },
  };

  /**
   * Builds a fresh minimal multichain core mock for peer-range tests.
   *
   * @param version - The runtime version exposed on the mocked core.
   * @returns A mocked multichain core.
   */
  function buildCore(version: string): {
    version: string;
    provider: { getSession: ReturnType<typeof vi.fn> };
    disconnect: ReturnType<typeof vi.fn>;
  } {
    return {
      version,
      provider: {
        getSession: vi.fn().mockResolvedValue({ sessionScopes: {} }),
      },
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('warns when core.version does not satisfy the configured peer range', async () => {
    vi.stubGlobal('__CONNECT_MULTICHAIN_PEER_VERSION_RANGE__', '^0.15.0');
    (createMultichainClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCore('0.14.0'),
    );
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    await createBitcoinClient({ ...baseOptions, skipAutoRegister: true });

    expect(warnSpy).toHaveBeenCalledWith(
      '@metamask/connect-bitcoin expected @metamask/connect-multichain version ^0.15.0, but got 0.14.0. This may lead to unexpected behavior.',
    );
  });

  it('does not warn when core.version satisfies the configured peer range', async () => {
    vi.stubGlobal('__CONNECT_MULTICHAIN_PEER_VERSION_RANGE__', '^0.15.0');
    (createMultichainClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCore('0.15.2'),
    );
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    await createBitcoinClient({ ...baseOptions, skipAutoRegister: true });

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining(
        '@metamask/connect-bitcoin expected @metamask/connect-multichain',
      ),
    );
  });

  it('does not warn when the peer range is an empty string', async () => {
    vi.stubGlobal('__CONNECT_MULTICHAIN_PEER_VERSION_RANGE__', '');
    (createMultichainClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCore('0.14.0'),
    );
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    await createBitcoinClient({ ...baseOptions, skipAutoRegister: true });

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining(
        '@metamask/connect-bitcoin expected @metamask/connect-multichain',
      ),
    );
  });
});
