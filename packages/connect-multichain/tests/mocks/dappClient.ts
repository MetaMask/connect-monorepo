/**
 * This file mocks Dapp Client package in the SDK
 * Allowing us to mock DappClient completelly in our tests (see fixtures.test.ts)
 */
import * as vitest from 'vitest';

vitest.vi.mock('@metamask/mobile-wallet-protocol-dapp-client');
