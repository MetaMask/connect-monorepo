/* eslint-disable no-restricted-globals -- Test mocks window intentionally */
/* eslint-disable @typescript-eslint/consistent-type-imports -- Dynamic import required for mock */
/**
 * This file mocks the platform detection module
 * We mock hasExtension to return based on window.ethereum.isMetaMask
 */
import * as vitest from 'vitest';

vitest.vi.mock('../../src/domain/platform', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/domain/platform')>();
  return {
    ...actual,
    hasExtension: vitest.vi.fn(async () => {
      if (typeof window === 'undefined') {
        return false;
      }
      return Boolean(window.ethereum?.isMetaMask);
    }),
  };
});
