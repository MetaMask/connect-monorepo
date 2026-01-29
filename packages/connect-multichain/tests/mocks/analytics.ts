/**
 * This file mocks Analytics package in the SDK
 * Allowing us to know if specific events triggered or not
 */
import * as vitest from 'vitest';

vitest.vi.mock('@metamask/analytics', () => ({
  analytics: {
    setGlobalProperty: vitest.vi.fn(),
    enable: vitest.vi.fn(),
    track: vitest.vi.fn(),
  },
}));
