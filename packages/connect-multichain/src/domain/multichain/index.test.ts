/* eslint-disable id-length -- vitest alias */
import type { MultichainApiClient } from '@metamask/multichain-api-client';
import type { Json } from '@metamask/utils';
import * as t from 'vitest';

import { MultichainCore, TransportType, type ConnectionStatus } from '.';
import type { RPCAPI, RpcUrlsMap } from './api/types';
import type {
  ExtendedTransport,
  MergeableMultichainOptions,
  MultichainOptions,
} from './types';
import type { StoreClient } from '../store/client';

class MockMultichainCore extends MultichainCore {
  storage = {} as StoreClient;

  status: ConnectionStatus = 'loaded';

  provider = {} as MultichainApiClient<RPCAPI>;

  transport = {} as ExtendedTransport;

  transportType = TransportType.UNKNOWN;

  connect = async (): Promise<void> => Promise.resolve();

  disconnect = async (): Promise<void> => Promise.resolve();

  invokeMethod = async (): Promise<Json> => Promise.resolve({});

  openDeeplinkIfNeeded = (): void => undefined;

  emitSessionChanged = async (): Promise<void> => Promise.resolve();

  /**
   * Exposes options for test assertions.
   *
   * @returns Current merged options.
   */
  getOptions(): MultichainOptions {
    return this.options;
  }
}

/**
 * Creates base multichain options for tests.
 *
 * @returns Default MultichainOptions used in mergeOptions tests.
 */
function createBaseOptions(): MultichainOptions {
  return {
    dapp: { name: 'Test Dapp', url: 'https://example.com' },
    api: {
      supportedNetworks: {
        'eip155:1': 'https://eth.mainnet.example',
        'eip155:11155111': 'https://eth.sepolia.example',
      } as RpcUrlsMap,
    },
    storage: {} as StoreClient,
    ui: {
      factory: {} as MultichainOptions['ui']['factory'],
      headless: false,
      preferExtension: true,
      showInstallModal: false,
    },
    mobile: {
      useDeeplink: false,
    },
    transport: {
      extensionId: 'ext-123',
    },
    debug: false,
  };
}

t.describe('MultichainCore', () => {
  t.describe('mergeOptions', () => {
    t.it('merges api.supportedNetworks shallowly over existing', () => {
      const base = createBaseOptions();
      const core = new MockMultichainCore(base);

      core.mergeOptions({
        api: {
          supportedNetworks: {
            'eip155:1': 'https://overridden.example',
            'solana:mainnet': 'https://solana.example',
          },
        },
      });

      const opts = core.getOptions();
      t.expect(opts.api.supportedNetworks['eip155:1']).toBe(
        'https://overridden.example',
      );
      t.expect(opts.api.supportedNetworks['eip155:11155111']).toBe(
        'https://eth.sepolia.example',
      );
      t.expect(opts.api.supportedNetworks['solana:mainnet']).toBe(
        'https://solana.example',
      );
    });

    t.it(
      'leaves api.supportedNetworks unchanged when partial.api is omitted',
      () => {
        const base = createBaseOptions();
        const core = new MockMultichainCore(base);

        core.mergeOptions({});

        const opts = core.getOptions();
        t.expect(opts.api.supportedNetworks).toEqual(
          base.api.supportedNetworks,
        );
      },
    );

    t.it(
      'leaves api.supportedNetworks unchanged when partial.api.supportedNetworks is empty',
      () => {
        const base = createBaseOptions();
        const core = new MockMultichainCore(base);

        core.mergeOptions({ api: { supportedNetworks: {} } });

        const opts = core.getOptions();
        t.expect(opts.api.supportedNetworks).toEqual(
          base.api.supportedNetworks,
        );
      },
    );

    t.it(
      'merges ui.headless, preferExtension, showInstallModal from partial',
      () => {
        const base = createBaseOptions();
        const core = new MockMultichainCore(base);

        core.mergeOptions({
          ui: {
            headless: true,
            preferExtension: false,
            showInstallModal: true,
          },
        });

        const opts = core.getOptions();
        t.expect(opts.ui.headless).toBe(true);
        t.expect(opts.ui.preferExtension).toBe(false);
        t.expect(opts.ui.showInstallModal).toBe(true);
        t.expect(opts.ui.factory).toBe(base.ui.factory);
      },
    );

    t.it('keeps existing ui values when partial.ui fields are omitted', () => {
      const base = createBaseOptions();
      base.ui.headless = true;
      base.ui.preferExtension = false;
      const core = new MockMultichainCore(base);

      core.mergeOptions({ ui: {} });

      const opts = core.getOptions();
      t.expect(opts.ui.headless).toBe(true);
      t.expect(opts.ui.preferExtension).toBe(false);
      t.expect(opts.ui.showInstallModal).toBe(false);
    });

    t.it('merges mobile options over existing', () => {
      const base = createBaseOptions();
      const core = new MockMultichainCore(base);

      core.mergeOptions({
        mobile: {
          useDeeplink: true,
        },
      });

      const opts = core.getOptions();
      t.expect(opts.mobile?.useDeeplink).toBe(true);
      t.expect(opts.mobile).toEqual({ useDeeplink: true });
    });

    t.it('leaves mobile unchanged when partial.mobile is omitted', () => {
      const base = createBaseOptions();
      const core = new MockMultichainCore(base);

      core.mergeOptions({});

      const opts = core.getOptions();
      t.expect(opts.mobile).toEqual(base.mobile);
    });

    t.it('merges transport.extensionId from partial', () => {
      const base = createBaseOptions();
      const core = new MockMultichainCore(base);

      core.mergeOptions({
        transport: { extensionId: 'new-ext-456' },
      });

      const opts = core.getOptions();
      t.expect(opts.transport?.extensionId).toBe('new-ext-456');
    });

    t.it(
      'preserves existing transport when partial.transport is omitted',
      () => {
        const base = createBaseOptions();
        const core = new MockMultichainCore(base);

        core.mergeOptions({});

        const opts = core.getOptions();
        t.expect(opts.transport).toEqual(base.transport);
      },
    );

    t.it('sets transport when initial options had no transport', () => {
      const base = createBaseOptions();
      delete base.transport;
      const core = new MockMultichainCore(base);

      core.mergeOptions({ transport: { extensionId: 'new-ext' } });

      const opts = core.getOptions();
      t.expect(opts.transport?.extensionId).toBe('new-ext');
    });

    t.it('merges debug from partial', () => {
      const base = createBaseOptions();
      const core = new MockMultichainCore(base);

      core.mergeOptions({ debug: true });

      const opts = core.getOptions();
      t.expect(opts.debug).toBe(true);
    });

    t.it('keeps existing debug when partial.debug is omitted', () => {
      const base = createBaseOptions();
      base.debug = true;
      const core = new MockMultichainCore(base);

      core.mergeOptions({});

      const opts = core.getOptions();
      t.expect(opts.debug).toBe(true);
    });

    t.it('does not mutate dapp, storage, or analytics', () => {
      const base = createBaseOptions();
      base.analytics = { integrationType: 'direct' };
      const core = new MockMultichainCore(base);

      core.mergeOptions({
        api: { supportedNetworks: { 'eip155:1': 'https://x.com' } },
        ui: { headless: true },
        debug: true,
      });

      const opts = core.getOptions();
      t.expect(opts.dapp).toBe(base.dapp);
      t.expect(opts.storage).toBe(base.storage);
      t.expect(opts.analytics).toEqual(base.analytics);
    });

    t.it('handles full partial merge correctly', () => {
      const base = createBaseOptions();
      const core = new MockMultichainCore(base);

      const partial: MergeableMultichainOptions = {
        api: {
          supportedNetworks: {
            'eip155:1': 'https://merged-eth.example',
          },
        },
        ui: {
          headless: true,
          preferExtension: false,
          showInstallModal: true,
        },
        mobile: { useDeeplink: true },
        transport: { extensionId: 'merged-ext' },
        debug: true,
      };

      core.mergeOptions(partial);

      const opts = core.getOptions();
      t.expect(opts.api.supportedNetworks['eip155:1']).toBe(
        'https://merged-eth.example',
      );
      t.expect(opts.api.supportedNetworks['eip155:11155111']).toBe(
        'https://eth.sepolia.example',
      );
      t.expect(opts.ui).toMatchObject({
        headless: true,
        preferExtension: false,
        showInstallModal: true,
      });
      t.expect(opts.mobile).toEqual({ useDeeplink: true });
      t.expect(opts.transport?.extensionId).toBe('merged-ext');
      t.expect(opts.debug).toBe(true);
    });
  });
});
