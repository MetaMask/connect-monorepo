import type { CaipAccountId, CaipChainId, Json } from "@metamask/utils";
/**
 * Methods that require an account parameter.
 */
export declare const METHODS_REQUIRING_PARAM_INJECTION: {
    readonly eth_sendTransaction: true;
    readonly eth_signTypedData_v4: true;
    readonly personal_sign: true;
    readonly eth_getBalance: true;
    readonly wallet_sendCalls: true;
    readonly wallet_getCapabilities: true;
};
/**
 * Injects address and chainId (where applicable) into example params for a given method.
 * @param method - The method to inject the address into.
 * @param exampleParams - The example params to inject the address into.
 * @param addressToInject - The address to inject.
 * @param scopeToInject - The scope to inject the address into.
 * @returns The updated example params with the address injected.
 */
export declare const injectParams: (method: string, exampleParams: Json, addressToInject: CaipAccountId, scopeToInject: CaipChainId) => Json;
/**
 * Known Wallet RPC methods.
 */
export declare const KnownWalletRpcMethods: string[];
/**
 * Wallet methods that are EIP-155 compatible but not scoped to a specific chain.
 */
export declare const WalletEip155Methods: string[];
/**
 * EIP-155 specific notifications.
 */
export declare const Eip155Notifications: string[];
/**
 * All MetaMask methods, except for ones we have specified in the constants above.
 */
export declare const Eip155Methods: string[];
//# sourceMappingURL=methods.d.mts.map