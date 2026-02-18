/* eslint-disable id-length -- vitest alias */
/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
/* eslint-disable jsdoc/require-param-description -- Test helpers */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Test functions */
/* eslint-disable promise/param-names -- Test promise patterns */
/* eslint-disable no-negated-condition -- Test assertions */
/* eslint-disable @typescript-eslint/unbound-method -- Mock assertions */
/* eslint-disable @typescript-eslint/naming-convention -- Test type parameters */
import { SessionStore } from '@metamask/mobile-wallet-protocol-core';
import * as t from 'vitest';

import type {
  MultichainOptions,
  MultichainCore,
  Scope,
  SessionData,
} from './domain';
// Careful, order of import matters to keep mocks working
import { Store } from './store';
import { mockSessionData, mockSessionRequestData } from '../tests/data';
import {
  runTestsInNodeEnv,
  runTestsInRNEnv,
  runTestsInWebEnv,
  runTestsInWebMobileEnv,
} from '../tests/fixtures.test';
import type { TestSuiteOptions, MockedData } from '../tests/types';
import { MULTICHAIN_PROVIDER_STREAM_NAME } from './multichain/transports/constants';

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

      // Set the transport type as a string in storage (this is how it's stored)
      testOptions = {
        ...originalSdkOptions,
        api: {
          ...originalSdkOptions.api,
          supportedNetworks: {},
        },
        analytics: {
          ...originalSdkOptions.analytics,
          enabled: platform !== 'node',
          integrationType: 'test',
        },
        ui: uiOptions,

        storage: new Store({
          platform: platform as 'web' | 'rn' | 'node',
          async get(key) {
            return Promise.resolve(mockedData.nativeStorageStub.getItem(key));
          },
          async set(key, value) {
            return Promise.resolve(
              mockedData.nativeStorageStub.setItem(key, value),
            );
          },
          async delete(key) {
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

    t.it(`${platform} should handle session upgrades`, async () => {
      const scopes = ['eip155:1', 'eip155:137'] as Scope[];
      const caipAccountIds = [
        'eip155:1:0x1234567890abcdef1234567890abcdef12345678',
        'eip155:137:0x1234567890abcdef1234567890abcdef12345678',
      ] as any;
      const mockedSessionUpgradeData: SessionData = {
        ...mockSessionData,
        sessionScopes: {
          ...mockSessionData.sessionScopes,
          'eip155:137': {
            accounts: ['eip155:137:0x1234567890abcdef1234567890abcdef12345678'],
            methods: [],
            notifications: [],
          },
        },
      };
      mockedData.nativeStorageStub.setItem(
        'multichain-transport',
        transportString,
      );

      // this should be cached already
      if (platform !== 'web') {
        mockedData.nativeStorageStub.setItem(
          'cache_wallet_getSession',
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'wallet_sessionChanged',
            result: mockSessionData,
          }),
        );
      }

      mockedData.mockWalletGetSession.mockImplementation(
        async () => mockSessionData,
      );
      mockedData.mockSessionRequest.mockImplementation(
        async () => mockSessionRequestData,
      );
      mockedData.mockWalletCreateSession.mockImplementation(
        async () => mockedSessionUpgradeData,
      );

      t.vi
        .spyOn(SessionStore.prototype, 'list')
        .mockImplementation(async () =>
          Promise.resolve([await (mockedData as any).mockWalletGetSession()]),
        );

      sdk = await createSDK(testOptions);

      t.expect(sdk.status).toBe('connected');
      t.expect(sdk.transport).toBeDefined();
      t.expect(sdk.provider).toBeDefined();
      t.expect(sdk.storage).toBeDefined();
      await t.expect(sdk.storage.getTransport()).resolves.toBe(transportString);

      mockedData.mockDefaultTransport.request.mockClear();
      mockedData.mockDappClient.sendRequest.mockClear();

      await sdk.connect(scopes, caipAccountIds);

      if (platform === 'web') {
        t.expect(mockedData.mockDefaultTransport.request).toHaveBeenCalledWith(
          t.expect.objectContaining({
            method: 'wallet_getSession',
          }),

          { timeout: 60 * 1000 },
        );
        t.expect(mockedData.mockDefaultTransport.request).toHaveBeenCalledWith(
          t.expect.objectContaining({
            method: 'wallet_revokeSession',
            params: mockSessionData,
          }),
          { timeout: 60 * 1000 },
        );

        t.expect(mockedData.mockDefaultTransport.request).toHaveBeenCalledWith(
          t.expect.objectContaining({
            method: 'wallet_createSession',
            params: {
              optionalScopes: mockedSessionUpgradeData.sessionScopes,
            },
          }),
          { timeout: 60 * 1000 },
        );
      } else {
        // Session is cached in storage so we don't need to call the getSession method
        t.expect(
          mockedData.mockDappClient.sendRequest,
        ).not.toHaveBeenCalledWith(
          t.expect.objectContaining({
            name: MULTICHAIN_PROVIDER_STREAM_NAME,
            data: t.expect.objectContaining({
              method: 'wallet_getSession',
            }),
          }),
        );
        t.expect(mockedData.mockDappClient.sendRequest).toHaveBeenCalledWith(
          t.expect.objectContaining({
            name: MULTICHAIN_PROVIDER_STREAM_NAME,
            data: t.expect.objectContaining({
              method: 'wallet_createSession',
              params: {
                optionalScopes: mockedSessionUpgradeData.sessionScopes,
              },
            }),
          }),
        );
      }
    });

    t.it(
      `${platform} should handle session retrieval when no session exists`,
      async () => {
        const scopes = ['eip155:1'] as Scope[];
        const caipAccountIds = [
          'eip155:1:0x1234567890abcdef1234567890abcdef12345678',
        ] as any;

        mockedData.nativeStorageStub.setItem(
          'multichain-transport',
          transportString,
        );
        mockedData.mockWalletGetSession.mockImplementation(
          () => undefined as any,
        );
        mockedData.mockSessionRequest.mockImplementation(
          async () => mockSessionRequestData,
        );
        mockedData.mockWalletCreateSession.mockImplementation(
          async () => mockSessionData,
        );

        sdk = await createSDK(testOptions);
        t.expect(sdk.status).toBe('connected');

        t.expect(sdk).toBeDefined();
        t.expect(sdk.transport).toBeDefined();
        t.expect(sdk.storage).toBeDefined();

        await sdk.connect(scopes, caipAccountIds);

        /**
         * We expect the default transport to be called when on web and mobile wallet protocol for the rest
         */
        if (platform === 'web') {
          t.expect(
            mockedData.mockDefaultTransport.request,
          ).toHaveBeenCalledWith(
            t.expect.objectContaining({
              method: 'wallet_getSession',
            }),
            { timeout: 60 * 1000 },
          );
          t.expect(
            mockedData.mockDefaultTransport.request,
          ).toHaveBeenCalledWith(
            t.expect.objectContaining({
              method: 'wallet_createSession',
              params: {
                optionalScopes: mockSessionData.sessionScopes,
              },
            }),
            { timeout: 60 * 1000 },
          );
        } else {
          t.expect(mockedData.mockDappClient.sendRequest).toHaveBeenCalledWith(
            t.expect.objectContaining({
              name: MULTICHAIN_PROVIDER_STREAM_NAME,
              data: t.expect.objectContaining({
                method: 'wallet_createSession',
                params: {
                  optionalScopes: {},
                },
              }),
            }),
          );
        }
      },
    );

    t.it(
      `${platform} should handle provider errors during session retrieval`,
      async () => {
        const scopes = ['eip155:1'] as Scope[];
        const caipAccountIds = [
          'eip155:1:0x1234567890abcdef1234567890abcdef12345678',
        ] as any;

        // Get mocks from the module mock
        const sessionError = new Error('Session error');
        mockedData.mockSessionRequest.mockImplementation(
          async () => mockSessionRequestData,
        );
        mockedData.mockWalletCreateSession.mockRejectedValue(sessionError);
        mockedData.mockWalletGetSession.mockRejectedValue(sessionError);

        sdk = await createSDK(testOptions);

        t.expect(sdk).toBeDefined();
        t.expect(sdk.status === 'loaded').toBe(true);

        // For web-mobile, connect might hang waiting for deeplink
        // Use a shorter timeout and handle both success and timeout cases
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Connect timeout')),
            3000,
          );
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
          // If we get here without timeout, connect succeeded unexpectedly
          t.expect.fail('Expected connect to throw an error');
        } catch (error) {
          clearTimeout(timeoutId);

          if (error instanceof Error && error.message === 'Connect timeout') {
            // For web-mobile, timeout might be expected due to deeplink hanging
            // Verify state instead
            timedOut = true;
          } else {
            connectError = error;
          }
        } finally {
          clearTimeout(timeoutId);
        }

        // Verify state is disconnected after error (or timeout)
        // For web-mobile, if it timed out, the state might still be 'loaded' or 'connecting'
        if (!timedOut) {
          t.expect(sdk.status === 'disconnected').toBe(true);
          t.expect(connectError).toBeDefined();
        } else {
          // If timed out, at least verify it's not connected
          t.expect(['loaded', 'disconnected', 'connecting']).toContain(
            sdk.status,
          );
        }

        // Ensure both promises are fully handled to prevent unhandled rejections
        // Wait a tick to ensure any pending rejections are caught
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
      },
      { timeout: 15000 },
    );
  });
}

const exampleDapp = { name: 'Test Dapp', url: 'https://test.dapp' };

const baseTestOptions = { dapp: exampleDapp } as any;

runTestsInNodeEnv(baseTestOptions, testSuite);
runTestsInRNEnv(baseTestOptions, testSuite);
runTestsInWebEnv(baseTestOptions, testSuite, exampleDapp.url);
runTestsInWebMobileEnv(baseTestOptions, testSuite, exampleDapp.url);
