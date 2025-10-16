import type { SessionData } from "@metamask/multichain-api-client";
import type { CaipAccountId, CaipChainId, Json } from "@metamask/utils";
import type { MethodObject } from "@open-rpc/meta-schema";
import type { Dispatch, SetStateAction } from "react";
/**
 * Normalizes parameters for method invocation.
 * - For Solana methods: keeps params as an object
 * - For EVM methods: ensures params are in array format
 * - Applies special handling for specific methods.
 *
 * @param method - The method name being invoked.
 * @param params - The raw parameters.
 * @param scope - The scope/chain ID to determine the chain type.
 * @returns Normalized parameters (array for EVM, object for Solana).
 */
export declare const normalizeMethodParams: (method: string, params: Json, scope?: string) => Json[] | Json;
/**
 * Updates the invoke method results state in an immutable way.
 *
 * @param previousResults - Previous invoke method results state.
 * @param scope - The scope being updated.
 * @param method - The method being updated.
 * @param result - The result or error to add.
 * @param request - The request that was made.
 * @returns Updated results state.
 */
export declare const updateInvokeMethodResults: (previousResults: Record<string, Record<string, {
    result: Json | Error;
    request: Json;
}[]>>, scope: CaipChainId, method: string, result: Json | Error, request: Json) => {
    [x: string]: Record<string, {
        result: Json | Error;
        request: Json;
    }[]> | {
        [x: string]: {
            result: Json | Error;
            request: Json;
        }[];
    };
};
export declare const extractRequestParams: (finalRequestObject: {
    params: {
        request: {
            params: Json;
        };
    };
}) => Json;
export declare const extractRequestForStorage: (finalRequestObject: {
    params: {
        request: Json;
    };
}) => Json;
/**
 * Auto-selects the first available account for a scope if none is currently selected.
 * Updates the provided setter function with the selected account.
 *
 * @param caipChainId - The CAIP chain ID of the scope.
 * @param currentSelectedAccount - The currently selected account for this scope.
 * @param currentSession - The current session object.
 * @param setSelectedAccounts - Function to update the selected accounts state.
 * @returns The selected account or null if none available.
 */
export declare const autoSelectAccountForScope: (caipChainId: CaipChainId, currentSelectedAccount: CaipAccountId | null, currentSession: SessionData, setSelectedAccounts: Dispatch<SetStateAction<Record<string, CaipAccountId | null>>>) => CaipAccountId | null;
/**
 * Prepares a method request object for invocation.
 *
 * @param method - The method name to invoke.
 * @param caipChainId - The CAIP chain ID.
 * @param selectedAccount - The selected account for this scope.
 * @param metamaskOpenrpcDocument - The MetaMask OpenRPC document.
 * @param injectParams - Function to inject parameters for specific methods.
 * @param openRPCExampleToJSON - Function to convert OpenRPC examples to JSON.
 * @param METHODS_REQUIRING_PARAM_INJECTION - Object containing methods that require parameter injection.
 * @returns The prepared request object or null if method not found.
 */
export declare const prepareMethodRequest: (method: string, caipChainId: CaipChainId, selectedAccount: CaipAccountId | null, metamaskOpenrpcDocument: any, injectParams: (method: string, params: Json, account: CaipAccountId, scope: CaipChainId) => Json, openRPCExampleToJSON: (methodObj: MethodObject) => Json, METHODS_REQUIRING_PARAM_INJECTION: Record<string, boolean>) => Json | null;
//# sourceMappingURL=MethodInvocationHelpers.d.mts.map