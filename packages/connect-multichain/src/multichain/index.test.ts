/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MetaMaskConnectMultichain } from '.';

const singletonKey = '__METAMASK_CONNECT_MULTICHAIN_SINGLETON__';

describe('MetaMaskConnectMultichain', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[singletonKey];
  });

  it('uses the existing singleton analytics setup hook when reusing a compatible instance from another package copy', async () => {
    const existingInstance = {
      mergeOptions: vi.fn(),
      setupAnalytics: vi.fn().mockResolvedValue(undefined),
    };
    (globalThis as Record<string, unknown>)[singletonKey] =
      Promise.resolve(existingInstance);

    const result = await MetaMaskConnectMultichain.create({
      analytics: { integrationType: 'direct' },
    } as Parameters<typeof MetaMaskConnectMultichain.create>[0]);

    expect(result).toBe(existingInstance);
    expect(existingInstance.mergeOptions).toHaveBeenCalledWith({
      analytics: { integrationType: 'direct' },
    });
    expect(existingInstance.setupAnalytics).toHaveBeenCalledTimes(1);
  });
});
