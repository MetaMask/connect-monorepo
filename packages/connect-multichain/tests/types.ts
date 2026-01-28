/* eslint-disable @typescript-eslint/no-unused-vars -- Transport import used for type reference */
import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';
import type { DappClient } from '@metamask/mobile-wallet-protocol-dapp-client';
import type { SessionData, Transport } from '@metamask/multichain-api-client';
import type * as vitest from 'vitest';

import type { MultichainOptions, MultichainCore } from '../src/domain';
import type { MetaMaskConnectMultichain } from '../src/multichain';

type GetItem = (key: string) => string | null;
type SetItem = (key: string, value: string) => void;
type RemoveItem = (key: string) => void;
type Clear = () => void;

export type NativeStorageStub = {
  data: Map<string, string>;
  getItem: vitest.Mock<GetItem>;
  setItem: vitest.Mock<SetItem>;
  removeItem: vitest.Mock<RemoveItem>;
  clear: vitest.Mock<Clear>;
};

export type MockedData = {
  initSpy: vitest.MockInstance<any>;
  setupAnalyticsSpy: vitest.MockInstance<any>;
  emitSpy: vitest.MockInstance<MetaMaskConnectMultichain['emit']>;
  showInstallModalSpy: vitest.MockInstance<any>;
  nativeStorageStub: NativeStorageStub;

  mockDappClient: vitest.Mocked<DappClient>;
  mockDefaultTransport: vitest.Mocked<any>;
  mockLogger: vitest.MockInstance<debug.Debugger>;

  // Mocking RPC method responses for all transports
  mockWalletGetSession: vitest.MockInstance<
    (request: any) => Promise<SessionData>
  >;
  mockWalletCreateSession: vitest.MockInstance<
    (request: any) => Promise<SessionData>
  >;
  mockWalletRevokeSession: vitest.MockInstance<(request: any) => Promise<void>>;
  mockWalletInvokeMethod: vitest.MockInstance<(request: any) => Promise<any>>;

  // Mocking MWP session request
  mockSessionRequest: vitest.MockInstance<() => Promise<SessionRequest>>;
};

export type TestSuiteOptions<TOptions extends MultichainOptions> = {
  platform: string;
  createSDK: Options<TOptions>['createSDK'];
  options: Options<TOptions>['options'];
  beforeEach: () => Promise<MockedData>;
  afterEach: (mocks: MockedData) => Promise<void>;
  storage: NativeStorageStub;
};

export type Options<TOptions extends MultichainOptions> = {
  platform: 'web' | 'node' | 'rn' | 'web-mobile';
  options: TOptions;
  createSDK: (options: TOptions) => Promise<MultichainCore>;
  setupMocks?: (options: NativeStorageStub) => void;
  cleanupMocks?: () => void;
  tests: (options: TestSuiteOptions<TOptions>) => void;
};

export type CreateTestFN = <TOptions extends MultichainOptions>(
  options: Options<TOptions>,
) => void;
