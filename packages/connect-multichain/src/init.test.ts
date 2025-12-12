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
import type { TestSuiteOptions, MockedData } from '../tests/types';
import { mockSessionData, mockSessionRequestData } from '../tests/data';

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
        t.expect(['pending', 'loaded', 'connected']).toContain(sdk.state);
      },
    );

    t.it(
      `${platform} should enable analytics by default if platform is not nodejs`,
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
          t.expect(trackSpy).not.toHaveBeenCalled();
        } else {
          // For web and web-mobile platforms, analytics should be enabled
          t.expect(enableSpy.mock.calls.length).toBeGreaterThan(0);
          t.expect(trackSpy.mock.calls.length).toBeGreaterThan(0);
          t.expect(trackSpy).toHaveBeenCalledWith(
            'mmconnect_initialized',
            t.expect.objectContaining({
              mmconnect_version: t.expect.any(String),
              dapp_id: t.expect.any(String),
              platform: t.expect.any(String),
              integration_type: t.expect.any(String),
            }),
          );
        }
        
        enableSpy.mockRestore();
        trackSpy.mockRestore();
      },
    );

    t.it(
      `${platform} should NOT call analytics.enable if analytics is DISABLED and should NOT trigger event`,
      async () => {
        // Spy on analytics methods
        const enableSpy = t.vi.spyOn(analytics, 'enable');
        const trackSpy = t.vi.spyOn(analytics, 'track');
        
        (testOptions.analytics as any).enabled = false;
        sdk = await createSDK(testOptions);
        t.expect(sdk).toBeDefined();
        // Verify analytics was not enabled through observable effects
        t.expect(enableSpy).not.toHaveBeenCalled();
        t.expect(trackSpy).not.toHaveBeenCalled();
        
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
        t.expect(sdk.state).toBe('loaded');
        t.expect(loggerModule.enableDebug).toHaveBeenCalledWith(
          'metamask-sdk:core',
        );
      },
    );

    t.it(
      `${platform} should properly initialize if no transport is found during init`,
      async () => {
        sdk = await createSDK(testOptions);
        t.expect(sdk.state).toBe('loaded');
        t.expect(() => sdk.transport).toThrow();
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

        t.expect(sdk.state).toBe('connected');

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
            onNotification: onNotification,
          },
        };
        sdk = await createSDK(optionsWithEvent);

        t.expect(sdk).toBeDefined();

        t.expect(sdk.state).toBe('connected');
        t.expect(onNotification).toHaveBeenCalledWith({
          method: 'stateChanged',
          params: 'connected',
        });
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
          mockedData.nativeStorageStub.data.set('multichain-transport', 'browser');
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
        t.expect(sdk.state).toBe('pending');

        // Access the mock logger from the module
        const mockLogger = (loggerModule as any).__mockLogger;

        // Verify that the logger was called with the error
        // The error might be wrapped in a StorageGetErr, so check for the error message
        t.expect(mockLogger).toHaveBeenCalled();
        const lastCall = mockLogger.mock.calls[mockLogger.mock.calls.length - 1];
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
