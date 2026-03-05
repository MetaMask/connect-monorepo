import type { Wallet } from '@wallet-standard/base';
import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import {
  isBitcoinStandardWalletStandardWallet,
  isBitcoinStatsConnectWalletStandardWallet,
  WalletConnectionType
} from '../helpers/bitcoinFeatures';
import { useBitcoin } from '../sdk/BitcoinProvider';
import { TEST_IDS } from '@metamask/playground-ui';


// Add spinner animation keyframes to document
const addSpinnerKeyframes = () => {
  const styleId = 'wallet-spinner-keyframes';
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes wallet-spinner-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
};

interface BitcoinWalletSelectionModalProps {
  isOpen: boolean;
  wallets: readonly Wallet[];
  onClose: () => void;
  connectingWallet?: Wallet | undefined;
}

export function BitcoinWalletSelectionModal({ isOpen, wallets, onClose, connectingWallet }: BitcoinWalletSelectionModalProps) {
  // Initialize spinner keyframes
  useEffect(() => {
    if (isOpen) {
      setExpandedWallet(undefined);
    }
    addSpinnerKeyframes();
  }, [isOpen]);

  const { connectWithStandardWallet, connectWithSatsConnectWallet } = useBitcoin();
  const [expandedWallet, setExpandedWallet] = useState<Wallet | undefined>(undefined);

  const isDualCompatible = useCallback((wallet: Wallet) => {
    return isBitcoinStandardWalletStandardWallet(wallet) && isBitcoinStatsConnectWalletStandardWallet(wallet);
  }, []);

  const handleWalletClick = useCallback(
    (wallet: Wallet) => {
      if (isDualCompatible(wallet)) {
        setExpandedWallet(expandedWallet?.name === wallet.name ? undefined : wallet);
      } else {
        setExpandedWallet(undefined);
        // For single-compatible wallets, connect directly with the appropriate type
        if (isBitcoinStandardWalletStandardWallet(wallet)) {
          connectWithStandardWallet(wallet);
        } else if (isBitcoinStatsConnectWalletStandardWallet(wallet)) {
          connectWithSatsConnectWallet(wallet);
        } else {
          connectWithStandardWallet(wallet);
        }
        onClose();
      }
    },
    [expandedWallet, onClose, isDualCompatible, connectWithStandardWallet, connectWithSatsConnectWallet],
  );

  const handleTypeSelection = useCallback(
    (wallet: Wallet, type: WalletConnectionType) => {
      setExpandedWallet(undefined);
      if (type === WalletConnectionType.SatsConnect) {
        connectWithSatsConnectWallet(wallet);
      } else {
        connectWithStandardWallet(wallet);
      }
      onClose();
    },
    [onClose, connectWithStandardWallet, connectWithSatsConnectWallet],
  );

  const getWalletFeatureLabel = useCallback((wallet: Wallet): string => {
    const isStandard = isBitcoinStandardWalletStandardWallet(wallet);
    const isSatsConnect = isBitcoinStatsConnectWalletStandardWallet(wallet);

    if (isStandard && isSatsConnect) {
      return 'Standard + Sats Connect';
    }
    if (isStandard) {
      return 'Standard';
    }
    if (isSatsConnect) {
      return 'Sats Connect';
    }
    return 'Unknown';
  }, []);

  // Styles
  const overlayStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  };

  const contentStyle: CSSProperties = {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 16px 24px',
    borderBottom: '1px solid #e5e7eb',
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#111827',
  };

  const closeButtonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.2s',
  };

  const bodyStyle: CSSProperties = {
    padding: '16px 24px 24px 24px',
    overflowY: 'auto',
    flex: 1,
  };

  const emptyStyle: CSSProperties = {
    textAlign: 'center',
    padding: '40px 20px',
  };

  const emptyTextStyle: CSSProperties = {
    margin: '0 0 8px 0',
    color: '#6b7280',
  };

  const helpTextStyle: CSSProperties = {
    fontSize: '0.875rem',
    color: '#9ca3af',
  };

  const walletListStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const getWalletItemStyle = (isDisabled: boolean, isConnecting: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    border: `1px solid ${isConnecting ? '#3b82f6' : '#e5e7eb'}`,
    borderRadius: '8px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    background: isConnecting ? '#eff6ff' : 'white',
    width: '100%',
    textAlign: 'left' as const,
    opacity: isDisabled ? 0.5 : 1,
    transform: 'none',
  });

  const walletInfoStyle: CSSProperties = {
    flex: 1,
  };

  const walletNameStyle: CSSProperties = {
    fontWeight: 600,
    color: '#111827',
    marginBottom: '4px',
    fontSize: '1rem',
  };

  const walletFeaturesStyle: CSSProperties = {
    fontSize: '0.875rem',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '4px',
    display: 'inline-block',
  };

  const walletIconStyle: CSSProperties = {
    flexShrink: 0,
    marginLeft: '16px',
  };

  const walletIconImgStyle: CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    objectFit: 'contain' as const,
  };

  const walletLoaderStyle: CSSProperties = {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const spinnerStyle: CSSProperties = {
    width: '20px',
    height: '20px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'wallet-spinner-spin 1s linear infinite',
  };

  const connectionTypeContainerStyle: CSSProperties = {
    marginTop: '8px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  };

  const connectionTypeButtonsStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
  };

  const connectionTypeButtonStyle: CSSProperties = {
    flex: 1,
    padding: '12px 16px',
    fontSize: '0.875rem',
    fontWeight: '500',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#f8fafc',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
  };

  if (!isOpen) {
    return undefined;
  }

  return (
    <div
      style={overlayStyle}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      // biome-ignore lint/a11y/useSemanticElements: <explanation>
      role="button"
      tabIndex={0}
    >
      <div
        data-testid={TEST_IDS.bitcoin.walletSelectionModal.container}
        style={contentStyle}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        // biome-ignore lint/a11y/useSemanticElements: <explanation>
        role="dialog"
        tabIndex={-1}
      >
        <div style={headerStyle}>
          <h2 style={titleStyle}>Select a wallet</h2>
          <button
            type="button"
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          {wallets.length === 0 ? (
            <div style={emptyStyle}>
              <p style={emptyTextStyle}>No wallet available</p>
              <p style={helpTextStyle}>Make sure you have installed a compatible Bitcoin wallet</p>
            </div>
          ) : (
            <div data-testid={TEST_IDS.bitcoin.walletSelectionModal.walletList} style={walletListStyle}>
              {wallets.map((wallet, index) => {
                const isConnecting = connectingWallet === wallet;
                const isDisabled = !!connectingWallet;

                return (
                  <div key={`${wallet.name}-${index}`}>
                    {expandedWallet?.name !== wallet.name && (
                      <button
                        data-testid={TEST_IDS.bitcoin.walletSelectionModal.walletOption}
                        type="button"
                        style={getWalletItemStyle(isDisabled, isConnecting)}
                        onClick={() => handleWalletClick(wallet)}
                        disabled={isDisabled}
                        onMouseEnter={(e) => {
                          if (!isDisabled) {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.boxShadow =
                              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDisabled) {
                            e.currentTarget.style.borderColor = isConnecting ? '#3b82f6' : '#e5e7eb';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'none';
                          }
                        }}
                      >
                        <div style={walletInfoStyle}>
                          <div style={walletNameStyle}>{wallet.name}</div>
                          <div style={walletFeaturesStyle}>{getWalletFeatureLabel(wallet)}</div>
                        </div>
                        <div style={walletIconStyle}>
                          {isConnecting ? (
                            <div style={walletLoaderStyle}>
                              <div style={spinnerStyle} />
                            </div>
                          ) : (
                            wallet.icon && <img src={wallet.icon} alt={wallet.name} style={walletIconImgStyle} />
                          )}
                        </div>
                      </button>
                    )}
                    {expandedWallet?.name === wallet.name && (
                      <div style={connectionTypeContainerStyle}>
                        <div style={connectionTypeButtonsStyle}>
                          <button
                            data-testid={TEST_IDS.bitcoin.walletSelectionModal.standardButton}
                            type="button"
                            style={connectionTypeButtonStyle}
                            onClick={() => handleTypeSelection(wallet, WalletConnectionType.Standard)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#3b82f6';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8fafc';
                              e.currentTarget.style.color = '#374151';
                            }}
                          >
                            Standard
                          </button>
                          <button
                            data-testid={TEST_IDS.bitcoin.walletSelectionModal.satsConnectButton}
                            type="button"
                            style={connectionTypeButtonStyle}
                            onClick={() => handleTypeSelection(wallet, WalletConnectionType.SatsConnect)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#3b82f6';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8fafc';
                              e.currentTarget.style.color = '#374151';
                            }}
                          >
                            Sats Connect
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedWallet(undefined)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#3b82f6';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8fafc';
                              e.currentTarget.style.color = '#374151';
                            }}
                          >
                            X
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
