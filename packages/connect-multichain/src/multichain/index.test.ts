/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MetaMaskConnectMultichain } from '.';

const singletonKey = '__METAMASK_CONNECT_MULTICHAIN_SINGLETON__';

describe('MetaMaskConnectMultichain', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[singletonKey];
  });

  it('uses public singleton fields instead of setupAnalytics when reusing another package copy', async () => {
    const storage = { getAnonId: vi.fn().mockResolvedValue('anon-id') };
    const existingInstance = {
      mergeOptions: vi.fn(),
      setupAnalytics: vi.fn().mockResolvedValue(undefined),
      options: { analytics: { integrationType: 'direct' } },
      storage,
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
    expect(existingInstance.setupAnalytics).not.toHaveBeenCalled();
  });

  it('does not require reused singleton instances from older package copies to have setupAnalytics', async () => {
    const storage = { getAnonId: vi.fn().mockResolvedValue('anon-id') };
    const existingInstance = {
      mergeOptions: vi.fn(),
      options: { analytics: { integrationType: 'direct' } },
      storage,
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
  });
});
