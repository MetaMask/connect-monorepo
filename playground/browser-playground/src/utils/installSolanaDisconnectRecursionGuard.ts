const SOLANA_DISCONNECT_PATCH_FLAG = '__metamaskSolanaDisconnectPatchApplied';

type SolanaWalletState = {
  connectorId?: string;
  session?: { disconnect: () => Promise<void> };
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
};

type SolanaStoreState = {
  wallet: SolanaWalletState;
};

type SolanaClientForDisconnectPatch = {
  actions: {
    disconnectWallet: () => Promise<void>;
    [SOLANA_DISCONNECT_PATCH_FLAG]?: boolean;
  };
  connectors: {
    get: (
      connectorId: string,
    ) => { disconnect: () => Promise<void> } | undefined;
  };
  store: {
    getState: () => SolanaStoreState;
    setState: (
      partial:
        | Partial<SolanaStoreState>
        | ((state: SolanaStoreState) => Partial<SolanaStoreState>),
    ) => void;
  };
};

/**
 * Temporary workaround for a recursive disconnect loop triggered by wallet-standard events.
 * Remove once upstream @solana/client disconnect flow is patched.
 *
 * @param client - The Solana client instance
 */
export function installSolanaDisconnectRecursionGuard(client: unknown): void {
  const typedClient = client as SolanaClientForDisconnectPatch;

  if (typedClient.actions[SOLANA_DISCONNECT_PATCH_FLAG]) {
    return;
  }

  let isDisconnecting = false;

  typedClient.actions.disconnectWallet = async (): Promise<void> => {
    if (isDisconnecting) {
      return;
    }

    isDisconnecting = true;
    try {
      const { wallet } = typedClient.store.getState();
      if (wallet.status === 'disconnected') {
        return;
      }

      // Mark disconnected first to avoid disconnect re-entry from wallet events.
      typedClient.store.setState({ wallet: { status: 'disconnected' } });

      if (wallet.status === 'connected' && wallet.session) {
        await wallet.session.disconnect();
      }

      if (wallet.connectorId) {
        await typedClient.connectors.get(wallet.connectorId)?.disconnect();
      }
    } finally {
      // Only reset flag if we successfully disconnected
      if (!isDisconnecting) {
        isDisconnecting = false;
      }
    }
  };

  typedClient.actions[SOLANA_DISCONNECT_PATCH_FLAG] = true;
}
