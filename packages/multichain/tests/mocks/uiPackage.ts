import * as t from 'vitest';

t.vi.mock('@metamask/multichain-ui/dist/loader/index.cjs.js', () => ({
  defineCustomElements: t.vi.fn(),
}));
