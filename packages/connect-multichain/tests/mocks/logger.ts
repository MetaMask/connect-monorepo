/* eslint-disable @typescript-eslint/naming-convention -- Test mocks use __prefixed naming */

import * as vitest from 'vitest';

vitest.vi.mock('../../src/domain/logger', () => {
  const mockLogger = vitest.vi.fn();
  return {
    createLogger: vitest.vi.fn(() => mockLogger),
    enableDebug: vitest.vi.fn(() => {
      // No-op mock
    }),
    isEnabled: vitest.vi.fn(() => true),
    __mockLogger: mockLogger,
  };
});
