/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('platform extension detection', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('does not read the global window after the detection timer starts', async () => {
    vi.useFakeTimers();

    const windowRef = {
      navigator: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal('window', windowRef);
    vi.stubGlobal('navigator', windowRef.navigator);

    await import('.');

    vi.stubGlobal('window', undefined);

    expect(() => vi.advanceTimersByTime(300)).not.toThrow();
    expect(windowRef.removeEventListener).toHaveBeenCalledWith(
      'eip6963:announceProvider',
      expect.any(Function),
    );
  });
});
