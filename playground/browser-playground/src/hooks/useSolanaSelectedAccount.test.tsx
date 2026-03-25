import { renderHook, act } from '@testing-library/react';
import type { WalletSession } from '@solana/client';

import { useSolanaSelectedAccount } from './useSolanaSelectedAccount';

type WalletAccount = WalletSession['account'];

function createMockSession(initialAddress: string) {
  let accountsChangedListener: ((accounts: WalletAccount[]) => void) | undefined;
  const unsubscribe = jest.fn();

  const session = {
    account: {
      address: initialAddress,
      publicKey: new Uint8Array([]),
    },
    connector: {
      id: 'wallet-standard:metamask',
      name: 'MetaMask',
    },
    disconnect: async () => undefined,
    onAccountsChanged: (listener: (accounts: WalletAccount[]) => void) => {
      accountsChangedListener = listener;
      return unsubscribe;
    },
  } as unknown as WalletSession;

  return {
    emitAccountsChanged: (accounts: WalletAccount[]) => {
      accountsChangedListener?.(accounts);
    },
    session,
    unsubscribe,
  };
}

describe('useSolanaSelectedAccount', () => {
  it('uses the current session account as initial value', () => {
    const { session } = createMockSession('11111111111111111111111111111111');

    const { result } = renderHook(() => useSolanaSelectedAccount(session));

    expect(result.current).toBe('11111111111111111111111111111111');
  });

  it('updates when wallet accounts change', () => {
    const { session, emitAccountsChanged } = createMockSession(
      '11111111111111111111111111111111',
    );

    const { result } = renderHook(() => useSolanaSelectedAccount(session));

    act(() => {
      emitAccountsChanged([
        {
          address: '22222222222222222222222222222222',
          publicKey: new Uint8Array([]),
        } as WalletAccount,
      ]);
    });

    expect(result.current).toBe('22222222222222222222222222222222');
  });

  it('clears account when wallet reports no accounts', () => {
    const { session, emitAccountsChanged } = createMockSession(
      '11111111111111111111111111111111',
    );

    const { result } = renderHook(() => useSolanaSelectedAccount(session));

    act(() => {
      emitAccountsChanged([]);
    });

    expect(result.current).toBeNull();
  });
});
