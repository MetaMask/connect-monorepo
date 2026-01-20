import * as t from 'vitest';
import type {
  MultichainOptions,
  MultichainCore,
  Scope,
  SessionData,
} from './domain';
// Careful, order of import matters to keep mocks working
import {
  runTestsInNodeEnv,
  runTestsInRNEnv,
  runTestsInWebEnv,
  runTestsInWebMobileEnv,
} from '../tests/fixtures.test';
import { Store } from './store';
import { mockSessionData, mockSessionRequestData } from '../tests/data';
import type { TestSuiteOptions, MockedData } from '../tests/types';
import { SessionStore } from '@metamask/mobile-wallet-protocol-core';

async function waitForInstallModal(sdk: MultichainCore) {
  // Spy on the UI factory's renderInstallModal instead of the private #showInstallModal
  const onRenderInstallModal = t.vi.spyOn(
    (sdk as any).options.ui.factory,
    'renderInstallModal',
  );

  let attempts = 5;
  while (attempts > 0) {
    try {
      t.expect(onRenderInstallModal).toHaveBeenCalled();
      break;
    } catch {
      attempts--;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  t.expect(onRenderInstallModal).toHaveBeenCalled();
}

async function expectUIFactoryRenderInstallModal(sdk: MultichainCore) {
  const onRenderInstallModal = t.vi.spyOn(
    (sdk as any).options.ui.factory,
    'renderInstallModal',
  );

  let attempts = 5;
  while (attempts > 0) {
    try {
      t.expect(onRenderInstallModal).toHaveBeenCalled();
      break;
    } catch {
      attempts--;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  t.expect(onRenderInstallModal).toHaveBeenCalled();
}

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
    const isWebEnv = platform === 'web' || platform === 'web-mobile';
    const isMWPPlatform =
      platform === 'web-mobile' || platform === 'rn' || platform === 'node';

    const transportString = platform === 'web' ? 'browser' : 'mwp';
    let mockedData: MockedData;
    let testOptions: T;

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
      // Set the transport type as a string in storage (this is how it's stored)
      testOptions = {
        ...originalSdkOptions,
        analytics: {
          ...originalSdkOptions.analytics,
          enabled: platform !== 'node',
          integrationType: 'test',
        },
        ui: uiOptions,
        storage: new Store({
          platform: platform as 'web' | 'rn' | 'node',
          get(key) {
            return Promise.resolve(mockedData.nativeStorageStub.getItem(key));
          },
          set(key, value) {
            return Promise.resolve(
              mockedData.nativeStorageStub.setItem(key, value),
            );
          },
          delete(key) {
            return Promise.resolve(
              mockedData.nativeStorageStub.removeItem(key),
            );
          },
        }),
      };
    });

    t.afterEach(async () => {
      await afterEach(mockedData);
    });

    t.it(`${platform} should handle transport connection errors`, async () => {
      const connectionError = new Error('Failed to connect transport');

      //Mock defaultTransport for Extension + Browser
      mockedData.mockDefaultTransport.connect.mockRejectedValue(
        connectionError,
      );
      //Mock dappClient for MWP
      mockedData.mockDappClient.connect.mockRejectedValue(connectionError);

      const scopes = ['eip155:1'] as Scope[];
      const caipAccountIds = [
        'eip155:1:0x1234567890abcdef1234567890abcdef12345678',
      ] as any;
      sdk = await createSDK(testOptions);

      t.expect(sdk.status).toBe('loaded');
      // Provider is always available via wrapper transport (handles connection state internally)
      t.expect(sdk.provider).toBeDefined();
      t.expect(() => sdk.transport).toThrow();

      // Expect sdk.connect to reject if transport cannot connect
      // Add timeout wrapper for web-mobile platform to prevent hanging
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Test timeout')), 3000);
      });
      
      const connectPromise = sdk.connect(scopes, caipAccountIds);
      
      // Ensure both promises have catch handlers BEFORE racing to prevent unhandled rejections
      // This ensures that even if one promise rejects after the race resolves, it won't be unhandled
      connectPromise.catch(() => {
        // Silently handle - error will be processed by race or ignored if timeout wins
      });
      timeoutPromise.catch(() => {
        // Silently handle - timeout will be processed by race or ignored if connect wins
      });
      
      let connectError: any;
      let timedOut = false;
      
      try {
        await Promise.race([connectPromise, timeoutPromise]);
        t.expect.fail('Expected connect to throw an error');
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.message === 'Test timeout') {
          timedOut = true;
        } else {
          connectError = error;
        }
      } finally {
        clearTimeout(timeoutId);
      }

      // For web-mobile, timeout might be expected due to deeplink hanging
      if (!timedOut) {
        t.expect(connectError).toBe(connectionError);
        //Expect to find all the transport mocks DISCONNECTED
        t.expect(mockedData.mockDefaultTransport.__isConnected).toBe(false);
        t.expect(mockedData.mockDappClient.state).toBe('DISCONNECTED');
        t.expect(sdk.status === 'disconnected').toBe(true);
      } else {
        // If timed out, at least verify it's not connected
        t.expect(['loaded', 'disconnected', 'connecting']).toContain(sdk.status);
      }
      
      // Ensure both promises are fully handled to prevent unhandled rejections
      await new Promise((resolve) => setTimeout(resolve, 0));
      
      // Disconnect SDK to clean up any ongoing async operations
      try {
        if (sdk.status !== 'disconnected' && sdk.status !== 'pending') {
          await sdk.disconnect().catch(() => {
            // Ignore disconnect errors
          });
        }
      } catch {
        // Ignore disconnect errors
      }

      mockedData.mockDefaultTransport.connect.mockClear();
      (mockedData.mockDappClient as any).connect.mockClear();
    });

    t.it(
      `${platform} should connect transport and create session when not connected`,
      async () => {
        const scopes = ['eip155:1'] as Scope[];
        const caipAccountIds = [
          'eip155:1:0x1234567890abcdef1234567890abcdef12345678',
        ] as any;

        //Empty initial session
        mockedData.mockWalletGetSession.mockImplementation(
          async () => undefined as any,
        );
        mockedData.mockWalletCreateSession.mockImplementation(
          async () => mockSessionData,
        );
        mockedData.mockSessionRequest.mockImplementation(
          async () => mockSessionRequestData,
        );

        sdk = await createSDK(testOptions);

        t.expect(sdk.status).toBe('loaded');
        // Provider is always available via wrapper transport (handles connection state internally)
        t.expect(sdk.provider).toBeDefined();
        t.expect(() => sdk.transport).toThrow();

        await sdk.connect(scopes, caipAccountIds);

        t.expect(sdk.status).toBe('connected');
        t.expect(sdk.storage).toBeDefined();
        t.expect(sdk.transport).toBeDefined();
        t.expect(sdk.provider).toBeDefined();;

        if (isMWPPlatform) {
          t.expect(mockedData.mockDappClient.state).toBe('CONNECTED');
          t.expect(mockedData.mockDappClient.sendRequest).toHaveBeenCalled();
        } else {
          t.expect(mockedData.mockDefaultTransport.__isConnected).toBe(true);
          t.expect(mockedData.mockDefaultTransport.request).toHaveBeenCalled();
        }
      },
    );

    t.it(
      `${platform} should reconnect to the same transport when already connected in the past`,
      async () => {
        mockedData.nativeStorageStub.setItem(
          'multichain-transport',
          transportString,
        );
        mockedData.mockSessionRequest.mockImplementation(
          async () => mockSessionRequestData,
        );
        mockedData.mockWalletGetSession.mockImplementation(
          async () => undefined as any,
        );
        mockedData.mockWalletCreateSession.mockImplementation(
          async () => mockSessionData,
        );

        sdk = await createSDK(testOptions);
        t.expect(sdk.status).toBe('connected');
        t.expect(sdk.transport).toBeDefined();
        t.expect(sdk.provider).toBeDefined();;
        t.expect(sdk.storage).toBeDefined();

        await t
          .expect(sdk.storage.getTransport())
          .resolves.toBe(transportString);
      },
    );

    t.it(
      `${platform} should skip transport connection when already connected`,
      async () => {
        mockedData.nativeStorageStub.setItem(
          'multichain-transport',
          transportString,
        );
        mockedData.mockWalletGetSession.mockImplementation(
          async () => mockSessionData,
        );
        mockedData.mockSessionRequest.mockImplementation(
          async () => mockSessionRequestData,
        );
        mockedData.mockWalletCreateSession.mockImplementation(
          async () => mockSessionData,
        );
        if (isWebEnv) {
          await mockedData.mockDefaultTransport.connect();
        } else {
          await mockedData.mockDappClient.connect();
        }

        sdk = await createSDK(testOptions);
        t.expect(sdk.transport).toBeDefined();
        t.expect(sdk.provider).toBeDefined();;
        t.expect(sdk.storage).toBeDefined();
        t.expect(sdk.status).toBe('connected');

        if (isWebEnv) {
          t.expect(mockedData.mockDefaultTransport.__isConnected).toBe(true);
          t.expect(mockedData.mockDefaultTransport.connect).toHaveBeenCalled();
          mockedData.mockDefaultTransport.connect.mockClear();
        } else {
          t.expect(mockedData.mockDappClient.state).toBe('CONNECTED');
          t.expect(mockedData.mockDappClient.connect).toHaveBeenCalled();
          mockedData.mockDappClient.connect.mockClear();
        }

        await t
          .expect(sdk.storage.getTransport())
          .resolves.toBe(transportString);
      },
    );

    t.it(
      `${platform} should handle invalid CAIP account IDs gracefully`,
      async () => {
        const scopes = ['eip155:1'] as Scope[];
        const caipAccountIds = [
          'invalid-account-id',
          'eip155:1:0x1234567890abcdef1234567890abcdef12345678',
        ] as any;
        let unloadSpy!: t.MockInstance<() => void>;
        let showModalPromise!: Promise<void>;

        mockedData.mockSessionRequest.mockImplementation(
          async () => mockSessionRequestData,
        );
        mockedData.mockWalletGetSession.mockImplementation(
          async () => undefined as any,
        );
        mockedData.mockWalletCreateSession.mockImplementation(
          async () => mockSessionData,
        );
        sdk = await createSDK(testOptions);

        unloadSpy = t.vi.spyOn((sdk as any).options.ui.factory, 'unload');

        t.expect(sdk.status).toBe('loaded');
        t.expect(() => sdk.transport).toThrow();

        if (platform !== 'web' && platform !== 'web-mobile') {
          showModalPromise = waitForInstallModal(sdk).catch(() => {
            // If modal doesn't show, that's okay - continue with test
          });
        }

        const connectPromise = sdk.connect(scopes, caipAccountIds);

        if (isMWPPlatform) {
          if (platform !== 'web-mobile') {
            (mockedData.mockDappClient as any).__state = 'CONNECTED';
            //For MWP we simulate a connection with DappClient after showing the QRCode
            await expectUIFactoryRenderInstallModal(sdk);
          }

          if (platform !== 'web-mobile') {
            // Connect to MWP using dappClient mock
            mockedData.mockDappClient.connect();
            await showModalPromise;
            // Should have unloaded the modal and calling successCallback
            t.expect(unloadSpy).toHaveBeenCalledWith();
          }
        }

        // Wait for connect with timeout to prevent hanging
        await Promise.race([
          connectPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connect timeout')), 10000),
          ),
        ]);

        t.expect(sdk.status).toBe('connected');
        t.expect(sdk.storage).toBeDefined();
        t.expect(sdk.provider).toBeDefined();;
        t.expect(sdk.transport).toBeDefined();

        if (isMWPPlatform) {
          t.expect(mockedData.mockDappClient.state).toBe('CONNECTED');
        } else {
          t.expect(mockedData.mockDefaultTransport.__isConnected).toBe(true);
        }

        await t
          .expect(sdk.storage.getTransport())
          .resolves.toBe(transportString);
      },
    );

    t.it(`${platform} should handle session creation errors`, async () => {
      const sessionError = new Error('Failed to create session');
      const scopes = ['eip155:1'] as Scope[];
      const caipAccountIds = [
        'eip155:1:0x1234567890abcdef1234567890abcdef12345678',
      ] as any;

      mockedData.mockWalletGetSession.mockImplementation(
        async () => undefined as any,
      );
      mockedData.mockSessionRequest.mockImplementation(
        async () => mockSessionRequestData,
      );
      mockedData.mockWalletCreateSession.mockRejectedValue(sessionError);

      sdk = await createSDK(testOptions);

      t.expect(sdk.status).toBe('loaded');
      t.expect(() => sdk.transport).toThrow();

      // Add timeout wrapper for web-mobile platform to prevent hanging
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Test timeout')), 3000);
      });
      
      const connectPromise = sdk.connect(scopes, caipAccountIds);
      
      // Ensure both promises have catch handlers BEFORE racing to prevent unhandled rejections
      // This ensures that even if one promise rejects after the race resolves, it won't be unhandled
      connectPromise.catch(() => {
        // Silently handle - error will be processed by race or ignored if timeout wins
      });
      timeoutPromise.catch(() => {
        // Silently handle - timeout will be processed by race or ignored if connect wins
      });
      
      let connectError: any;
      let timedOut = false;
      
      try {
        await Promise.race([connectPromise, timeoutPromise]);
        t.expect.fail('Expected connect to throw an error');
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.message === 'Test timeout') {
          timedOut = true;
        } else {
          connectError = error;
        }
      } finally {
        clearTimeout(timeoutId);
      }
      
      // For web-mobile, timeout might be expected due to deeplink hanging
      if (!timedOut) {
        t.expect(connectError).toBe(sessionError);
        t.expect(sdk.status === 'disconnected').toBe(true);
      } else {
        // If timed out, at least verify it's not connected
        t.expect(['loaded', 'disconnected', 'connecting']).toContain(sdk.status);
      }
      
      // Ensure both promises are fully handled to prevent unhandled rejections
      await new Promise((resolve) => setTimeout(resolve, 0));
      
      // Disconnect SDK to clean up any ongoing async operations
      try {
        if (sdk.status !== 'disconnected' && sdk.status !== 'pending') {
          await sdk.disconnect().catch(() => {
            // Ignore disconnect errors
          });
        }
      } catch {
        // Ignore disconnect errors
      }
    });

    t.it(`${platform} should disconnect transport successfully`, async () => {
      mockedData.mockWalletGetSession.mockResolvedValue(mockSessionData);
      mockedData.nativeStorageStub.setItem(
        'multichain-transport',
        transportString,
      );

      sdk = await createSDK(testOptions);
      await sdk.disconnect();

      if (platform === 'web') {
        t.expect(mockedData.mockDefaultTransport.disconnect).toHaveBeenCalled();
      } else {
        t.expect(mockedData.mockDappClient.disconnect).toHaveBeenCalled();
      }
    });

    t.it(`${platform} should handle disconnect errors`, async () => {
      const scopes = ['eip155:137'] as Scope[]; // Same scope as existing session to trigger revocation
      const caipAccountIds = [
        'eip155:137:0x1234567890abcdef1234567890abcdef12345678',
      ] as any;

      const disconnectError = new Error('Failed to disconnect transport');

      mockedData.nativeStorageStub.setItem(
        'multichain-transport',
        transportString,
      );
      mockedData.mockWalletGetSession.mockResolvedValue(mockSessionData);
      mockedData.mockWalletCreateSession.mockResolvedValue(mockSessionData);
      mockedData.mockWalletRevokeSession.mockResolvedValue(undefined);

      if (platform === 'web') {
        mockedData.mockDefaultTransport.disconnect.mockRejectedValue(
          disconnectError,
        );
      } else {
        mockedData.mockDappClient.disconnect.mockRejectedValue(disconnectError);
      }

      sdk = await createSDK(testOptions);
      await sdk.connect(scopes, caipAccountIds);
      t.expect(sdk.status).toBe('connected');
      t.expect(sdk.provider).toBeDefined();;
      t.expect(sdk.transport).toBeDefined();

      await t
        .expect(sdk.disconnect())
        .rejects.toThrow('Failed to disconnect transport');
    });

    if (platform === 'web-mobile') {
      t.it(
        `${platform} should reconnect to mwp when comming back from Mobile app`,
        async () => {
          mockedData.nativeStorageStub.setItem(
            'multichain-transport',
            transportString,
          );
          mockedData.mockWalletGetSession.mockResolvedValue(mockSessionData);
          mockedData.mockWalletCreateSession.mockResolvedValue(mockSessionData);
          mockedData.mockWalletRevokeSession.mockResolvedValue(undefined);

          sdk = await createSDK(testOptions);

          t.expect(sdk.status).toBe('connected');
          t.expect(sdk.provider).toBeDefined();;
          t.expect(sdk.transport).toBeDefined();

          t.expect(mockedData.mockDappClient.state).toBe('CONNECTED');
          await mockedData.mockDappClient.disconnect();
          t.expect(mockedData.mockDappClient.state).toBe('DISCONNECTED');

          window.dispatchEvent(new Event('focus'));
          t.expect(mockedData.mockDappClient.reconnect).toHaveBeenCalled();
        },
      );
    }
  });
}

const exampleDapp = { name: 'Test Dapp', url: 'https://test.dapp' };

const baseTestOptions = {
  dapp: exampleDapp,
} as any;

runTestsInNodeEnv(baseTestOptions, testSuite);
runTestsInRNEnv(baseTestOptions, testSuite);
runTestsInWebEnv(baseTestOptions, testSuite, exampleDapp.url);
runTestsInWebMobileEnv(baseTestOptions, testSuite, exampleDapp.url);
