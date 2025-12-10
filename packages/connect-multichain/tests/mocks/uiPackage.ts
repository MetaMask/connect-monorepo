import * as t from 'vitest';

t.vi.mock('@metamask/multichain-ui/loader', () => ({
  defineCustomElements: t.vi.fn(),
}));
