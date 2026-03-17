import { vi } from 'vitest';

const mockWallets: { name: string }[] = [];

export const getWallets = vi.fn().mockReturnValue({
  get: () => mockWallets,
});

export const setMockWallets = (wallets: { name: string }[]) => {
  mockWallets.length = 0;
  mockWallets.push(...wallets);
};
