/**
 * Shared Test ID Registry for cross-platform e2e testing.
 *
 * This module provides a centralized registry of test IDs that can be used
 * by both browser and React Native playgrounds, as well as e2e test suites.
 *
 * The naming convention follows a hierarchical pattern:
 * {component}-{element}-{identifier}
 *
 * Element type suffixes:
 * - `-btn` for buttons
 * - `-select` for select/picker elements
 * - `-input` for input/textinput elements
 * - `-checkbox` for checkboxes
 * - `-container` for container/view elements
 * - `-text` for text/label elements
 * - `-option` for option elements
 * - `-textarea` for textarea elements
 * - `-card` for card elements
 * - `-section` for section elements
 * - `-result` for result elements
 */

import { createTestId } from '../utils/testId';

/**
 * Test ID registry for consistent cross-platform testing.
 * These IDs are used by both browser and React Native playgrounds,
 * as well as e2e test suites.
 */
export const TEST_IDS = {
  // ============================================
  // APP LEVEL
  // ============================================
  app: {
    container: 'app-container',
    title: 'app-title',

    // Connection buttons
    btnConnect: (type?: string) =>
      type ? createTestId('app', 'btn', 'connect', type) : 'app-btn-connect',
    btnDisconnect: 'app-btn-disconnect',
    btnReconnect: 'app-btn-reconnect',
    btnCancel: 'app-btn-cancel',

    // Sections
    sectionScopes: 'app-section-scopes',
    sectionConnected: 'app-section-connected',
    sectionError: 'app-section-error',
  },

  // ============================================
  // DYNAMIC INPUTS
  // ============================================
  dynamicInputs: {
    container: (label: string) =>
      createTestId('dynamic-inputs', 'container', label),
    heading: (label: string) =>
      createTestId('dynamic-inputs', 'heading', label),
    checkbox: (value: string) =>
      createTestId('dynamic-inputs', 'checkbox', value),
    checkboxLabel: (value: string) =>
      createTestId('dynamic-inputs', 'label', value),
  },

  // ============================================
  // FEATURED NETWORKS
  // ============================================
  featuredNetworks: {
    container: 'featured-networks-container',
    networkItem: (chainId: string) =>
      createTestId('featured-networks', 'item', chainId),
    networkCheckbox: (chainId: string) =>
      createTestId('featured-networks', 'checkbox', chainId),
    networkLabel: (chainId: string) =>
      createTestId('featured-networks', 'label', chainId),
  },

  // ============================================
  // SCOPE CARD
  // ============================================
  scopeCard: {
    card: (scope: string) => createTestId('scope-card', scope),
    networkName: (scope: string) =>
      createTestId('scope-card', 'network-name', scope),

    // Account section
    accountsLabel: (scope: string) =>
      createTestId('scope-card', 'accounts-label', scope),
    accountsBadge: (scope: string) =>
      createTestId('scope-card', 'accounts-badge', scope),
    accountSelect: (scope: string) =>
      createTestId('scope-card', 'account-select', scope),
    accountOption: (scope: string, account: string) =>
      createTestId('scope-card', 'account-option', scope, account),
    activeAccount: (scope: string) =>
      createTestId('scope-card', 'active-account', scope),

    // Method section
    methodsLabel: (scope: string) =>
      createTestId('scope-card', 'methods-label', scope),
    methodsBadge: (scope: string) =>
      createTestId('scope-card', 'methods-badge', scope),
    methodSelect: (scope: string) =>
      createTestId('scope-card', 'method-select', scope),
    methodOption: (scope: string, method: string) =>
      createTestId('scope-card', 'method-option', scope, method),
    selectedMethod: (scope: string) =>
      createTestId('scope-card', 'selected-method', scope),

    // Invoke section
    invokeCollapsible: (scope: string) =>
      createTestId('scope-card', 'invoke-collapsible', scope),
    invokeTextarea: (scope: string) =>
      createTestId('scope-card', 'invoke-textarea', scope),
    invokeBtn: (scope: string) =>
      createTestId('scope-card', 'invoke-btn', scope),

    // Results
    resultContainer: (scope: string, method: string, index: number) =>
      createTestId('scope-card', 'result', scope, method, String(index)),
    resultMethod: (scope: string, method: string, index: number) =>
      createTestId('scope-card', 'result-method', scope, method, String(index)),
    resultStatus: (scope: string, method: string, index: number) =>
      createTestId('scope-card', 'result-status', scope, method, String(index)),
    resultCode: (scope: string, method: string, index: number) =>
      createTestId('scope-card', 'result-code', scope, method, String(index)),
  },

  // ============================================
  // LEGACY EVM CARD
  // ============================================
  legacyEvm: {
    card: 'legacy-evm-card',
    title: 'legacy-evm-title',
    btnDisconnect: 'legacy-evm-btn-disconnect',

    // Status display
    chainIdLabel: 'legacy-evm-chain-id-label',
    chainIdValue: 'legacy-evm-chain-id-value',
    accountsLabel: 'legacy-evm-accounts-label',
    accountsValue: 'legacy-evm-accounts-value',
    activeAccount: 'legacy-evm-active-account',

    // Response
    responseContainer: 'legacy-evm-response-container',
    responseLabel: 'legacy-evm-response-label',
    responseText: 'legacy-evm-response-text',

    // Buttons
    btnRequestPermissions: 'legacy-evm-btn-request-permissions',
    btnSignTypedDataV4: 'legacy-evm-btn-sign-typed-data-v4',
    btnPersonalSign: 'legacy-evm-btn-personal-sign',
    btnSendTransaction: 'legacy-evm-btn-send-transaction',
    btnSwitchToGoerli: 'legacy-evm-btn-switch-goerli',
    btnSwitchToSepolia: 'legacy-evm-btn-switch-sepolia',
    btnSwitchToMainnet: 'legacy-evm-btn-switch-mainnet',
    btnSwitchToPolygon: 'legacy-evm-btn-switch-polygon',
    btnAddPolygonChain: 'legacy-evm-btn-add-polygon-chain',

    // Read-only section
    readOnlySection: 'legacy-evm-section-read-only',
    btnGetBalance: 'legacy-evm-btn-get-balance',
    btnBlockNumber: 'legacy-evm-btn-block-number',
    btnGasPrice: 'legacy-evm-btn-gas-price',
  },

  // ============================================
  // WAGMI CARD
  // ============================================
  wagmi: {
    card: 'wagmi-card',
    title: 'wagmi-title',
    btnDisconnect: 'wagmi-btn-disconnect',

    // Status display
    chainIdLabel: 'wagmi-chain-id-label',
    chainIdValue: 'wagmi-chain-id-value',
    accountLabel: 'wagmi-account-label',
    accountValue: 'wagmi-account-value',
    activeAccount: 'wagmi-active-account',
    balanceContainer: 'wagmi-balance-container',
    balanceValue: 'wagmi-balance-value',
    blockNumberContainer: 'wagmi-block-number-container',
    blockNumberValue: 'wagmi-block-number-value',

    // Switch chain section
    switchChainSection: 'wagmi-section-switch-chain',
    btnSwitchChain: (chainId: number) =>
      createTestId('wagmi', 'btn-switch-chain', String(chainId)),

    // Sign message section
    signMessageSection: 'wagmi-section-sign-message',
    inputMessage: 'wagmi-input-message',
    btnSignMessage: 'wagmi-btn-sign-message',
    signatureResult: 'wagmi-signature-result',

    // Send transaction section
    sendTxSection: 'wagmi-section-send-transaction',
    inputToAddress: 'wagmi-input-to-address',
    inputAmount: 'wagmi-input-amount',
    btnSendTransaction: 'wagmi-btn-send-transaction',
    txHashResult: 'wagmi-tx-hash-result',
    txConfirmingText: 'wagmi-tx-confirming',
    txConfirmedText: 'wagmi-tx-confirmed',
    txErrorText: 'wagmi-tx-error',

    // Connector client section
    connectorSection: 'wagmi-section-connector',
    connectorAccount: 'wagmi-connector-account',
    connectorChainId: 'wagmi-connector-chain-id',
  },

  // ============================================
  // SOLANA CARD
  // ============================================
  solana: {
    card: 'solana-card',
    title: 'solana-title',
    btnConnect: 'solana-btn-connect',
    btnDisconnect: 'solana-btn-disconnect',
    status: 'solana-status',
    addressContainer: 'solana-address-container',
    signMessageSection: 'solana-section-sign-message',
    inputMessage: 'solana-input-message',
    btnSignMessage: 'solana-btn-sign-message',
    signedMessageResult: 'solana-signed-message-result',
    transactionsSection: 'solana-section-transactions',
    btnSignTransaction: 'solana-btn-sign-transaction',
    btnSendTransaction: 'solana-btn-send-transaction',
    transactionSignatureResult: 'solana-transaction-signature-result',
    errorContainer: 'solana-error-container',
  },

  // ============================================
  // WALLET LIST (Browser only)
  // ============================================
  walletList: {
    container: 'wallet-list-container',
    emptyMessage: 'wallet-list-empty',
    walletItem: (uuid: string) => createTestId('wallet-list', 'item', uuid),
    walletIcon: (uuid: string) => createTestId('wallet-list', 'icon', uuid),
    walletName: (uuid: string) => createTestId('wallet-list', 'name', uuid),
    walletUuid: (uuid: string) => createTestId('wallet-list', 'uuid', uuid),
    walletRdns: (uuid: string) => createTestId('wallet-list', 'rdns', uuid),
    walletExtensionId: (uuid: string) =>
      createTestId('wallet-list', 'extension-id', uuid),
    btnConnect: (uuid: string) =>
      createTestId('wallet-list', 'btn-connect', uuid),
  },
} as const;

// Type for the full TEST_IDS object
export type TestIdRegistry = typeof TEST_IDS;
