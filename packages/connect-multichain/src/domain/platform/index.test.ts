/* eslint-disable @typescript-eslint/naming-convention -- EIP-6963 uses rdns */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test window stubs are partial browser objects */
import * as t from 'vitest';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

const setupEip6963Window = (rdns: string): void => {
  const browserWindow = new EventTarget() as any;
  browserWindow.navigator = {
    userAgent: DESKTOP_USER_AGENT,
  };

  browserWindow.addEventListener('eip6963:requestProvider', () => {
    browserWindow.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: {
            rdns,
          },
        },
      }),
    );
  });

  t.vi.stubGlobal('window', browserWindow);
  t.vi.stubGlobal('navigator', browserWindow.navigator);
};

t.describe('hasExtension', () => {
  t.beforeEach(() => {
    t.vi.resetModules();
    t.vi.useFakeTimers();
  });

  t.afterEach(() => {
    t.vi.useRealTimers();
    t.vi.unstubAllGlobals();
  });

  t.it('does not treat the MMConnect-managed EIP-6963 provider as the native extension', async () => {
    setupEip6963Window('io.metamask.mmc');

    const { hasExtension } = await import('.');
    const detection = hasExtension();
    await t.vi.advanceTimersByTimeAsync(300);

    await t.expect(detection).resolves.toBe(false);
  });

  t.it.each(['io.metamask', 'io.metamask.mobile'])(
    'treats native MetaMask rdns %s as the extension',
    async (rdns) => {
      setupEip6963Window(rdns);

      const { hasExtension } = await import('.');
      const detection = hasExtension();
      await t.vi.advanceTimersByTimeAsync(300);

      await t.expect(detection).resolves.toBe(true);
    },
  );
});
