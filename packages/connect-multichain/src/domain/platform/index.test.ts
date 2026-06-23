/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

type ProviderAnnouncement = {
  detail: {
    info: {
      rdns: string;
    };
  };
};

type ProviderAnnouncementListener = (event: ProviderAnnouncement) => void;

type ProviderRequestEvent = {
  type: string;
};

const setupEip6963Window = (rdns: string): void => {
  const providerAnnouncementListeners = new Set<ProviderAnnouncementListener>();
  const browserWindow = {
    navigator: {
      userAgent: DESKTOP_USER_AGENT,
    },
    addEventListener: (
      type: string,
      listener: ProviderAnnouncementListener,
    ): void => {
      if (type === 'eip6963:announceProvider') {
        providerAnnouncementListeners.add(listener);
      }
    },
    removeEventListener: (
      type: string,
      listener: ProviderAnnouncementListener,
    ): void => {
      if (type === 'eip6963:announceProvider') {
        providerAnnouncementListeners.delete(listener);
      }
    },
    dispatchEvent: (event: ProviderRequestEvent): boolean => {
      if (event.type === 'eip6963:requestProvider') {
        for (const listener of providerAnnouncementListeners) {
          listener({
            detail: {
              info: {
                rdns,
              },
            },
          });
        }
      }

      return true;
    },
  };

  vi.stubGlobal('window', browserWindow);
  vi.stubGlobal('navigator', browserWindow.navigator);
};

describe('hasExtension', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not treat the MMConnect-managed EIP-6963 provider as the native extension', async () => {
    setupEip6963Window('io.metamask.mmc');

    const { hasExtension } = await import('.');
    const detection = hasExtension();
    await vi.advanceTimersByTimeAsync(300);

    await expect(detection).resolves.toBe(false);
  });

  it('uses the captured window if the global window is removed before detection completes', async () => {
    setupEip6963Window('io.metamask');

    const { hasExtension } = await import('.');
    const detection = hasExtension();
    vi.unstubAllGlobals();
    await vi.advanceTimersByTimeAsync(300);

    await expect(detection).resolves.toBe(true);
  });

  it.each(['io.metamask', 'io.metamask.mobile', 'io.metamask.flask'])(
    'treats native MetaMask rdns %s as the extension',
    async (rdns) => {
      setupEip6963Window(rdns);

      const { hasExtension } = await import('.');
      const detection = hasExtension();
      await vi.advanceTimersByTimeAsync(300);

      await expect(detection).resolves.toBe(true);
    },
  );
});
