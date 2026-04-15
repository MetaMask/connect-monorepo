/* eslint-disable id-length -- vitest alias */
/* eslint-disable import-x/order -- Mock imports need specific order */
/* eslint-disable jsdoc/require-param-description -- Test helpers */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Test functions */
/* eslint-disable @typescript-eslint/naming-convention -- Test naming and snake_case APIs */
/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Test assertions */
import * as t from 'vitest';

import type { MultichainOptions, MultichainCore } from './domain';
import {
  runTestsInNodeEnv,
  runTestsInRNEnv,
  runTestsInWebEnv,
  runTestsInWebMobileEnv,
} from '../tests/fixtures.test';

// Careful, order of import matters to keep mocks working
import { analytics } from '@metamask/analytics';
import * as loggerModule from './domain/logger';
import { mockSessionData, mockSessionRequestData } from '../tests/data';
import type { TestSuiteOptions, MockedData } from '../tests/types';

/**
 *
 * @param options0
 * @param options0.platform
 * @param options0.createSDK
 * @param options0.options
 */
function testSuite<T extends MultichainOptions>({
  platform,
  createSDK,
  options: sdkOptions,
  ...options
}: TestSuiteOptions<T>) {
  const { beforeEach, afterEach } = options;
  const originalSdkOptions = sdkOptions;
  let sdk: MultichainCore;

  t.describe(`${platform} tests`, () => {
    let mockedData: MockedData;
    let testOptions: T;
    const transportString = platform === 'web' ? 'browser' : 'mwp';

    t.beforeEach(async () => {
      const uiOptions: MultichainOptions['ui'] =
        platform === 'web-mobile'
          ? {
              ...originalSdkOptions.ui,
              showInstallModal: false,
              preferExtension: false,
            }
          : originalSdkOptions.ui;

      mockedData = await beforeEach();
      testOptions = {
        ...originalSdkOptions,
        ui: uiOptions,
        api: {
          ...originalSdkOptions.api,
          supportedNetworks: {},
        },
        analytics: {
          ...originalSdkOptions.analytics,
          enabled: platform === 'web' || platform === 'web-mobile',
          integrationType: 'test',
        },
      };
    });

    t.afterEach(async () => {
      await afterEach(mockedData);
    });

    t.it(
      `${platform} should automatically initialise the SDK after creation`,
      async () => {
        sdk = await createSDK(testOptions);
        // Verify initialization through observable state - SDK should be in a valid state
        t.expect(sdk).toBeDefined();
        t.expect(['pending', 'loaded', 'connected']).toContain(sdk.status);
      },
    );

    t.it(
      `${platform} should enable analytics when explicitly configured for web/web-mobile platforms`,
      async () => {
        // Spy on analytics methods BEFORE creating SDK
        const enableSpy = t.vi.spyOn(analytics, 'enable');
        const trackSpy = t.vi.spyOn(analytics, 'track');

        // Reset call history to ensure clean state
        enableSpy.mockClear();
        trackSpy.mockClear();

        sdk = await createSDK(testOptions);

        // Verify analytics setup through observable effects
        if (platform !== 'web' && platform !== 'web-mobile') {
          t.expect(enableSpy).not.toHaveBeenCalled();
        } else {
          // For web and web-mobile platforms, analytics should be enabled
          t.expect(enableSpy).toHaveBeenCalled();
        }

        enableSpy.mockRestore();
        trackSpy.mockRestore();
      },
    );

    t.it(
      `${platform} should call init and setupAnalytics with logger configuration`,
      async () => {
        const mockLogger = (loggerModule as any).__mockLogger;

        sdk = await createSDK(testOptions);
        t.expect(sdk).toBeDefined();
        t.expect(mockLogger).not.toHaveBeenCalled();

        // Verify initialization and analytics setup through observable effects
        t.expect(sdk.status).toBe('loaded');
        t.expect(loggerModule.enableDebug).toHaveBeenCalledWith(
          'metamask-sdk:core',
        );
      },
    );

    t.it(
      `${platform} should properly initialize if no transport is found during init`,
      async () => {
        sdk = await createSDK(testOptions);
        t.expect(sdk.status).toBe('loaded');
        if (platform === 'web') {
          // Web with extension sets up a DefaultTransport for passive listening
          t.expect(sdk.transport).toBeDefined();
        } else {
          t.expect(() => sdk.transport).toThrow();
        }
      },
    );

    t.it(
      `${platform} should properly initialize if existing session transport if found during init`,
      async () => {
        // Set the transport type as a string in storage (this is how it's stored)
        mockedData.nativeStorageStub.setItem(
          'multichain-transport',
          transportString,
        );

        mockedData.mockSessionRequest.mockImplementation(
          async () => mockSessionRequestData,
        );
        mockedData.mockWalletGetSession.mockImplementation(
          async () => mockSessionData,
        );
        mockedData.mockWalletCreateSession.mockImplementation(
          async () => mockSessionData,
        );

        sdk = await createSDK(testOptions);

        t.expect(sdk.status).toBe('connected');

        t.expect(sdk.transport).toBeDefined();
        t.expect(sdk.storage).toBeDefined();
      },
    );

    t.it(
      `${platform} should emit stateChanged event when existing valid session is found during init`,
      async () => {
        // Set the transport type as a string in storage (this is how it's stored)
        mockedData.nativeStorageStub.setItem(
          'multichain-transport',
          transportString,
        );
        mockedData.mockSessionRequest.mockImplementation(
          async () => mockSessionRequestData,
        );
        mockedData.mockWalletCreateSession.mockImplementation(
          async () => mockSessionData,
        );
        mockedData.mockWalletGetSession.mockImplementation(
          async () => mockSessionData,
        );

        const onNotification = t.vi.fn();
        const optionsWithEvent = {
          ...testOptions,
          transport: {
            ...(testOptions.transport ?? {}),
            onNotification,
          },
        };
        sdk = await createSDK(optionsWithEvent);

        t.expect(sdk).toBeDefined();

        t.expect(sdk.status).toBe('connected');
        t.expect(onNotification).toHaveBeenCalledWith({
          method: 'stateChanged',
          params: 'connected',
        });
      },
    );

    t.it(
      `${platform} should update mmconnect_versions analytics global when singleton merges new versions`,
      async () => {
        const setGlobalSpy = t.vi.spyOn(analytics, 'setGlobalProperty');

        sdk = await createSDK(testOptions);
        setGlobalSpy.mockClear();

        await createSDK({
          ...testOptions,
          versions: { 'connect-solana': '0.4.0' },
        } as any);

        if (platform === 'web' || platform === 'web-mobile') {
          t.expect(setGlobalSpy).toHaveBeenCalledWith(
            'mmconnect_versions',
            t.expect.objectContaining({ 'connect-solana': '0.4.0' }),
          );
        }

        setGlobalSpy.mockRestore();
      },
    );

    t.it(
      `${platform} should warn when existing singleton has a different version than the current module`,
      async () => {
        const warnSpy = t.vi.spyOn(console, 'warn').mockImplementation(() => {
          // noop
        });

        sdk = await createSDK(testOptions);

        // Simulate a version mismatch: override the singleton's version getter
        // so it looks like it was created by a different bundle version.
        t.vi
          .spyOn(sdk, 'version', 'get')
          .mockReturnValue('0.0.0-stale-singleton');

        await createSDK(testOptions);

        t.expect(warnSpy).toHaveBeenCalledWith(
          t.expect.stringContaining(
            'does not support using multiple versions',
          ),
        );

        warnSpy.mockRestore();
      },
    );

    t.it(
      `${platform} should not warn when existing singleton has the same version as the current module`,
      async () => {
        const warnSpy = t.vi.spyOn(console, 'warn').mockImplementation(() => {
          // noop
        });

        sdk = await createSDK(testOptions);
        warnSpy.mockClear();

        await createSDK(testOptions);

        t.expect(warnSpy).not.toHaveBeenCalledWith(
          t.expect.stringContaining(
            'does not support using multiple versions',
          ),
        );

        warnSpy.mockRestore();
      },
    );

    t.it(
      `${platform} should update integration_types analytics global when singleton sees a new integration`,
      async () => {
        const setGlobalSpy = t.vi.spyOn(analytics, 'setGlobalProperty');

        sdk = await createSDK(testOptions);
        setGlobalSpy.mockClear();

        await createSDK({
          ...testOptions,
          analytics: {
            ...testOptions.analytics,
            integrationType: 'wagmi',
          },
        } as any);

        if (platform === 'web' || platform === 'web-mobile') {
          t.expect(setGlobalSpy).toHaveBeenCalledWith('integration_types', [
            'wagmi',
          ]);
        }

        setGlobalSpy.mockRestore();
      },
    );

    t.it(
      `${platform} should normalize empty integrationType to direct for analytics globals`,
      async () => {
        const setGlobalSpy = t.vi.spyOn(analytics, 'setGlobalProperty');

        await createSDK({
          ...testOptions,
          analytics: {
            ...testOptions.analytics,
            integrationType: '',
          },
        } as any);

        if (platform === 'web' || platform === 'web-mobile') {
          t.expect(setGlobalSpy).toHaveBeenCalledWith('integration_types', [
            'direct',
          ]);
          t.expect(setGlobalSpy).not.toHaveBeenCalledWith('integration_types', [
            '',
          ]);
        }

        setGlobalSpy.mockRestore();
      },
    );

    t.it(
      `${platform} Should gracefully handle init errors by just logging them and return non initialized sdk`,
      async () => {
        const testError = new Error('Test error');

        // Clear storage to ensure getItem/setItem is called
        mockedData.nativeStorageStub.data.clear();

        // Mock storage methods to throw errors
        // For node platform: mock getItem to throw on TRANSPORT (in #setupTransport)
        // For RN/web-mobile: mock setItem to throw when setting anonId (after getItem returns null)
        // For web: mock getItem to throw on anonId (in #setupAnalytics)
        const getItemSpy = t.vi.spyOn(mockedData.nativeStorageStub, 'getItem');
        const setItemSpy = t.vi.spyOn(mockedData.nativeStorageStub, 'setItem');

        if (platform === 'node') {
          // Node: set multichain-transport in storage first, then throw when reading it
          // getTransport() calls adapter.get('multichain-transport') which calls getItem
          mockedData.nativeStorageStub.data.set(
            'multichain-transport',
            'browser',
          );
          getItemSpy.mockImplementation((key: string) => {
            if (key === 'multichain-transport') {
              throw testError;
            }
            return mockedData.nativeStorageStub.data.get(key) ?? null;
          });
        } else if (platform === 'rn') {
          // RN: set multichain-transport in storage first, then throw when reading it
          // Similar to node, since analytics is disabled for RN
          mockedData.nativeStorageStub.data.set('multichain-transport', 'mwp');
          getItemSpy.mockImplementation((key: string) => {
            if (key === 'multichain-transport') {
              throw testError;
            }
            return mockedData.nativeStorageStub.data.get(key) ?? null;
          });
        } else if (platform === 'web-mobile') {
          // Web-mobile: throw on anonId read (same as web, since both are browser platforms)
          getItemSpy.mockImplementation((key: string) => {
            if (key === 'anonId') {
              throw testError;
            }
            return mockedData.nativeStorageStub.data.get(key) ?? null;
          });
        } else {
          // Web: throw on anonId read
          getItemSpy.mockImplementation((key: string) => {
            if (key === 'anonId') {
              throw testError;
            }
            return mockedData.nativeStorageStub.data.get(key) ?? null;
          });
        }

        sdk = await createSDK(testOptions);

        t.expect(sdk).toBeDefined();
        t.expect(sdk.status).toBe('pending');

        // Access the mock logger from the module
        const mockLogger = (loggerModule as any).__mockLogger;

        // Verify that the logger was called with the error
        // The error might be wrapped in a StorageGetErr, so check for the error message
        t.expect(mockLogger).toHaveBeenCalled();
        const lastCall =
          mockLogger.mock.calls[mockLogger.mock.calls.length - 1];
        t.expect(lastCall[0]).toBe('MetaMaskSDK error during initialization');
        // The error might be wrapped, so check if it contains our test error message
        const loggedError = lastCall[1];
        t.expect(loggedError).toBeDefined();
        const errorMessage = loggedError?.message || String(loggedError);
        t.expect(errorMessage).toContain('Test error');

        // Restore spies
        getItemSpy.mockRestore();
        setItemSpy.mockRestore();
      },
    );
  });
}

const exampleDapp = { name: 'Test Dapp', url: 'https://test.dapp' };

const baseTestOptions = { dapp: exampleDapp } as any;

runTestsInNodeEnv(baseTestOptions, testSuite);
runTestsInRNEnv(baseTestOptions, testSuite);
runTestsInWebEnv(baseTestOptions, testSuite, exampleDapp.url);
runTestsInWebMobileEnv(baseTestOptions, testSuite, exampleDapp.url);
