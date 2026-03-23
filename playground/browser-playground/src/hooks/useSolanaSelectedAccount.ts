import type { WalletSession } from '@solana/client';
import { useEffect, useState } from 'react';

const getSessionAddress = (session?: WalletSession): string | null =>
  session ? String(session.account.address) : null;

/**
 * Tracks the currently selected wallet account, including runtime account switches.
 *
 * @param session - The @solana/client WalletSession
 * @returns The currently selected wallet account
 */
export const useSolanaSelectedAccount = (
  session?: WalletSession,
): string | null => {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(() =>
    getSessionAddress(session),
  );

  useEffect(() => {
    setSelectedAccount(getSessionAddress(session));

    return session?.onAccountsChanged?.((accounts) => {
      const nextAccount = accounts[0];
      setSelectedAccount(nextAccount ? String(nextAccount.address) : null);
    });
  }, [session]);

  return selectedAccount;
};
