import * as vitest from 'vitest';

vitest.vi.mock('@metamask/multichain-ui/loader', () => ({
  defineCustomElements: vitest.vi.fn(),
}));
