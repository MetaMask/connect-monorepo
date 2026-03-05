import { createBitcoinClient } from '@metamask/connect-bitcoin';
import { type WalletAccount, getWallets } from '@wallet-standard/core';
import type { Wallet } from '@wallet-standard/base';
import { AddressPurpose, BitcoinNetworkType, getAddress, sendBtcTransaction } from 'sats-connect';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { buildPSBT } from '../helpers/bitcoinHelpers';
import {
  BitcoinConnect,
  assertIsBitcoinStandardWalletStandardWallet,
  assertIsBitcoinStatsConnectWalletStandardWallet,
  BitcoinSatsConnect,
  BitcoinEvents,
  BitcoinDisconnect,
  BitcoinSignMessage,
  BitcoinSignAndSendTransaction,
  isBitcoinStandardWalletStandardWallet,
  BitcoinSignTransaction,
  BitcoinSignTransactionFeature,
  BitcoinSignMessageFeature,
  WalletConnectionType
} from '../helpers/bitcoinFeatures';

const BITCOIN_MAINNET_ENDPOINT = 'https://api.mainnet.bitcoin.com';

type BitcoinSDKContextType = {
  selectedAccount: WalletAccount | undefined;
  connected: boolean;
  network: string;
  selectedWallet: Wallet | undefined;
  accounts: WalletAccount[];
  statsConnectProvider: any | undefined;
  selectedConnectionType: WalletConnectionType | undefined;
  setSelectedAccount: (a: WalletAccount | undefined) => void;
  setAccounts: (a: WalletAccount[]) => void;
  setSelectedConnectionType: (type: WalletConnectionType | undefined) => void;
  connectWithStandardWallet: (wallet: Wallet) => Promise<void>;
  connectWithSatsConnectWallet: (wallet: Wallet) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array<ArrayBufferLike>>;
  sendPayment: (to: string, amountSats: bigint) => Promise<string>;
  signPsbt: (psbt: string, inputsToSign: any[]) => Promise<{ psbtBase64: string; txId: string }>;
  setSatsConnectProvider: (p: any | undefined) => void;
  setSelectedWallet: (w: Wallet | undefined) => void;
};

const BitcoinSDKContext = createContext<BitcoinSDKContextType | undefined>(
  undefined,
);

function useConnect() {
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | undefined>(undefined);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [wallet, setWallet] = useState<Wallet | undefined>(undefined);
  const [statsConnectProvider, setSatsConnectProvider] = useState<any | undefined>(undefined);
  const [selectedConnectionType, setSelectedConnectionType] = useState<WalletConnectionType | undefined>(undefined);
  const connected = !!selectedAccount;
  const network = 'bitcoin:mainnet';

  const onChange = useCallback(
    (event: any) => {
      if (event.accounts.length > 0) {
        setAccounts(event.accounts);
        setSelectedAccount(event.accounts[0]);
      }
    },
    [setAccounts, setSelectedAccount],
  );

  const connectWithStandardWallet = useCallback(
    async (wallet: Wallet) => {
      assertIsBitcoinStandardWalletStandardWallet(wallet);

      const { accounts } = await wallet.features[BitcoinConnect].connect({
        purposes: [AddressPurpose.Payment],
      });

      if (accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      wallet.features[BitcoinEvents].on('change', onChange);

      setAccounts(accounts.slice());
      setSelectedAccount(accounts[0]);
      setWallet(wallet);
      setSelectedConnectionType(WalletConnectionType.Standard);
    },
    [setAccounts, setSelectedAccount, setSelectedConnectionType],
  );

  const connectWithSatsConnectWallet = useCallback(
    async (wallet: Wallet) => {
      assertIsBitcoinStatsConnectWalletStandardWallet(wallet);

      let provider = statsConnectProvider;
      if (!provider) {
        // Pick first wallet if provider not yet selected
        const feature = wallet.features[BitcoinSatsConnect] as { provider?: any };
        if (!feature?.provider) {
          throw new Error('Sats Connect feature not available on selected wallet');
        }
        provider = feature.provider;
        if (!provider) {
          throw new Error('Provider unavailable');
        }
        setSatsConnectProvider(provider);
      }

      provider.addListener({
        eventName: 'accountChange',
        cb: onChangeAccountSatsConnect,
      });

      provider.addListener({
        eventName: 'disconnect',
        cb: onDisconnectSatsConnect,
      });

      const networkType = network === 'bitcoin:mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet;
      await getAddress({
        getProvider: async () => provider,
        payload: {
          purposes: [AddressPurpose.Payment],
          message: 'Address for receiving BTC',
          network: { type: networkType },
        },
        onFinish: (response: any) => {
          const list = (response.addresses || []).map((a: any) => ({ address: a.address, purpose: a.purpose }));
          setAccounts(list);
          const derived = list.find((a: any) => a.purpose === 'payment') || list[0] || null;
          setSelectedAccount(derived);
          setWallet(wallet);
          setSelectedConnectionType(WalletConnectionType.SatsConnect);
        },
        onCancel: () => {
          // user cancelled
        },
      });
    },
    [setAccounts, setSelectedAccount, statsConnectProvider],
  );

  const resetLocalState = useCallback(() => {
    setWallet(undefined);
    setAccounts([]);
    setSelectedAccount(undefined);
  }, [setWallet, setAccounts, setSelectedAccount]);

  const disconnect = useCallback(
    async () => {
      if (!wallet) {
        throw new Error('No wallet selected');
      }
  
      resetLocalState();
  
      if (isBitcoinStandardWalletStandardWallet(wallet)) {
        await wallet.features[BitcoinDisconnect].disconnect();
      }
    },
    [wallet, resetLocalState],
  );

  const onChangeAccountSatsConnect = useCallback(
    (event: any) => {
      if (event.addresses) {
        const list = (event.addresses || []).map((a: any) => ({ address: a.address, purpose: a.purpose }));
        setAccounts(list);
        const derived = list.find((a: any) => a.purpose === 'payment') || list[0] || null;
        setSelectedAccount(derived);
      }
    },
    [setAccounts, setSelectedAccount],
  );

  const onDisconnectSatsConnect = useCallback(() => {
    resetLocalState();
  }, [resetLocalState]);

  const signMessage = useCallback(
    async (message: Uint8Array) => {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }
      if (!selectedAccount) {
        throw new Error('Account not selected');
      }

      // Check if wallet supports bitcoin:signMessage feature
      const signMessageFeature = wallet.features[BitcoinSignMessage] as
        | BitcoinSignMessageFeature[typeof BitcoinSignMessage]
        | undefined;
      if (!signMessageFeature) {
        throw new Error('Wallet does not support message signing');
      }

      try {
        const result = await signMessageFeature.signMessage({
          account: selectedAccount,
          message,
        });

        return result[0]!.signature;
      } catch (error) {
        throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [selectedAccount, wallet],
  );

  const sendPaymentWithStandard = useCallback(
    async (to: string, amountSats: bigint) => {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }
      if (!selectedAccount) {
        throw new Error('Account not selected');
      }

      // Check if wallet supports bitcoin:signAndSendTransaction feature
      const signAndSendFeature = wallet.features[BitcoinSignAndSendTransaction] as any;
      if (!signAndSendFeature) {
        throw new Error('Wallet does not support transaction signing and sending');
      }

      // Build PSBT
      const { psbt, inputCount } = await buildPSBT(selectedAccount.address, to, amountSats);

      // Prepare inputs to sign - all inputs need to be signed by the sender account
      const inputsToSign = [
        {
          account: selectedAccount,
          signingIndexes: Array.from({ length: inputCount }, (_, i) => i),
        },
      ];

      // Call signAndSendTransaction
      const result = await signAndSendFeature.signAndSendTransaction({
        psbt,
        inputsToSign,
        chain: network,
      });

      if (result.length === 0 || !result[0]?.txId) {
        throw new Error('Transaction failed: no transaction ID returned');
      }

      return result[0].txId;
    },
    [selectedAccount, wallet],
  );

  const sendPaymentWithSatsConnect = useCallback(
    async (to: string, amountSats: bigint) => {
      if (!selectedAccount) {
        throw new Error('Wallet not connected');
      }
      if (!statsConnectProvider) {
        throw new Error('Sats Connect provider not available');
      }
      const networkType = network === 'bitcoin:mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet;
      const res = await new Promise((resolve, reject) =>
        sendBtcTransaction({
          getProvider: async () => statsConnectProvider,
          payload: {
            network: { type: networkType },
            recipients: [
              {
                address: to,
                amountSats,
              },
            ],
            senderAddress: selectedAccount.address,
          },
          onFinish: (r: any) => resolve(r?.result?.txId || r?.txId),
          onCancel: () => reject(new Error('Transaction cancelled')),
        }),
      );
      return res as string;
    },
    [selectedAccount, statsConnectProvider],
  );

  const sendPayment = useCallback(
    async (to: string, amountSats: bigint) => {
      if (!selectedConnectionType) {
        throw new Error('Connection type not selected');
      }
      switch (selectedConnectionType) {
        case WalletConnectionType.Standard:
          return sendPaymentWithStandard(to, amountSats);
        case WalletConnectionType.SatsConnect:
          return sendPaymentWithSatsConnect(to, amountSats);
        default:
          throw new Error(`Unsupported connection type: ${selectedConnectionType}`);
      }
    },
    [selectedConnectionType, sendPaymentWithStandard, sendPaymentWithSatsConnect],
  );

  const signPsbt = useCallback(
    async (psbt: string, inputsToSign: any[] = []) => {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }
      if (!selectedAccount) {
        throw new Error('Account not selected');
      }

      // Check if wallet supports bitcoin:signPsbt feature
      const signTransactionFeature = wallet.features[BitcoinSignTransaction] as
        | BitcoinSignTransactionFeature[typeof BitcoinSignTransaction]
        | undefined;
      if (!signTransactionFeature) {
        throw new Error('Wallet does not support PSBT signing');
      }

      const result = await signTransactionFeature.signTransaction({
        psbt: Buffer.from(psbt, 'base64'),
        inputsToSign: inputsToSign.map((input) => ({
          account: selectedAccount,
          signingIndexes: input.signingIndexes,
          sigHash: 'ALL',
        })),
        chain: network,
      });

      return {
        psbtBase64: Buffer.from(result[0]!.signedPsbt.buffer).toString('base64'),
        txId: '',
      };
    },
    [selectedAccount, wallet],
  );

  return {
    selectedAccount,
    connected,
    network,
    accounts,
    selectedWallet: wallet,
    statsConnectProvider,
    selectedConnectionType,
    setSelectedAccount,
    setAccounts,
    connectWithStandardWallet,
    connectWithSatsConnectWallet,
    disconnect,
    signMessage,
    sendPayment,
    signPsbt,
    setSatsConnectProvider,
    setSelectedWallet: setWallet,
    setSelectedConnectionType,
  }
}

/**
 * Provider that initializes the Bitcoin client and registers the MetaMask wallet.
 */
const BitcoinClientInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    selectedAccount,
    connected,
    network,
    accounts,
    selectedWallet,
    statsConnectProvider,
    selectedConnectionType,
    setSelectedAccount,
    setAccounts,
    connectWithStandardWallet,
    connectWithSatsConnectWallet,
    disconnect,
    signMessage,
    sendPayment,
    signPsbt,
    setSatsConnectProvider,
    setSelectedWallet,
    setSelectedConnectionType,
  } = useConnect();
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    createBitcoinClient({
      dapp: {
        name: 'MetaMask Connect Playground',
        url: window.location.origin,
      },
      api: {
        supportedNetworks: {
          mainnet: BITCOIN_MAINNET_ENDPOINT,
        },
      },
    })
      .then(() => {
        // Bitcoin client initialized and wallet registered
      })
      .catch((error) => {
        console.error('Failed to initialize Bitcoin client:', error);
      });
  }, []);

  const contextValue = useMemo(
    () => ({
      selectedAccount,
      connected,
      network,
      accounts,
      selectedWallet,
      statsConnectProvider,
      selectedConnectionType,
      setSelectedAccount,
      setAccounts,
      connectWithStandardWallet,
      connectWithSatsConnectWallet,
      disconnect,
      signMessage,
      sendPayment,
      signPsbt,
      setSatsConnectProvider,
      setSelectedWallet,
      setSelectedConnectionType,
    }),
    [
      selectedAccount,
      connected,
      network,
      accounts,
      selectedWallet,
      statsConnectProvider,
      selectedConnectionType,
      setSelectedAccount,
      setAccounts,
      connectWithStandardWallet,
      connectWithSatsConnectWallet,
      disconnect,
      signMessage,
      sendPayment,
      signPsbt,
      setSatsConnectProvider,
      setSelectedWallet,
      setSelectedConnectionType,
    ],
  );

  return (
    <BitcoinSDKContext.Provider value={contextValue}>
      {children}
    </BitcoinSDKContext.Provider>
  );
};

/**
 * Main Bitcoin provider that wraps the app with all necessary providers.
 */
export const BitcoinWalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <BitcoinClientInitializer>{children}</BitcoinClientInitializer>;
};

/**
 * Hook to access the Bitcoin SDK context.
 */
export const useBitcoin = () => {
  const context = useContext(BitcoinSDKContext);
  if (context === undefined) {
    throw new Error('useBitcoinSDK must be used within a BitcoinWalletProvider');
  }
  return context;
};

export { getWallets }
