/**
 * Input label types for dynamic input components.
 */
export enum INPUT_LABEL_TYPE {
  SCOPE = 'Scope',
  METHOD = 'Method',
  NOTIFICATION = 'Notification',
  ACCOUNT = 'Account',
}

/**
 * Props for dynamic input components that handle checkboxes.
 */
export type DynamicInputsProps = {
  /** Label describing the input group */
  label: INPUT_LABEL_TYPE;
  /** Currently selected values */
  inputArray: string[];
  /** All available options */
  availableOptions: string[];
  /** Handler for checkbox state changes */
  handleCheckboxChange: (value: string, checked: boolean) => void;
};

/**
 * Props for featured networks component.
 */
export type FeaturedNetworksProps = {
  /** Currently selected scopes */
  scopes: string[];
  /** Handler for scope changes */
  onScopeChange: (scope: string, checked: boolean) => void;
};

/**
 * Props for scope card component.
 */
export type ScopeCardProps = {
  /** The CAIP-2 chain ID */
  caipChainId: string;
  /** Available methods for this scope */
  methods: string[];
  /** Available accounts for this scope */
  accounts: string[];
  /** Currently selected account */
  selectedAccount: string | null;
  /** Handler for account selection */
  onAccountSelect: (account: string) => void;
  /** Handler for method invocation */
  onInvokeMethod: (method: string) => void;
  /** Results from method invocations */
  results?: Record<string, { result: unknown; request: unknown }[]>;
};

/**
 * Props for legacy EVM card component.
 */
export type LegacyEVMCardProps = {
  /** Whether the wallet is connected */
  isConnected: boolean;
  /** Current chain ID */
  chainId?: string;
  /** Connected account address */
  account?: string;
  /** Handler for connect action */
  onConnect: () => void;
  /** Handler for sign typed data action */
  onSignTypedData: () => void;
  /** Handler for personal sign action */
  onPersonalSign: () => void;
  /** Last sign result */
  signResult?: string;
};

/**
 * Props for wagmi card component.
 */
export type WagmiCardProps = {
  /** Whether wagmi is connected */
  isConnected: boolean;
  /** Connected address */
  address?: string;
  /** Current chain */
  chain?: { id: number; name: string };
  /** Available chains for switching */
  chains: { id: number; name: string }[];
  /** Handler for connect action */
  onConnect: () => void;
  /** Handler for disconnect action */
  onDisconnect: () => void;
  /** Handler for chain switch */
  onSwitchChain: (chainId: number) => void;
  /** Handler for send transaction */
  onSendTransaction: () => void;
  /** Handler for sign message */
  onSignMessage: () => void;
  /** Last transaction hash */
  txHash?: string;
  /** Last sign result */
  signResult?: string;
};
