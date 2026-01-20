import type { CaipAccountId, CaipChainId, Json } from '@metamask/utils';
import type { MethodObject } from '@open-rpc/meta-schema';
import type { Dispatch, SetStateAction } from 'react';

import type { SessionData, InvokeMethodResults } from '../types/sdk';

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
export const normalizeMethodParams = (
  method: string,
  params: Json,
  scope?: string,
): Json[] | Json => {
  // Solana methods should keep params as objects, not arrays
  const solanaMethodsThatUseObjects = [
    'signMessage',
    'signTransaction',
    'signAllTransactions',
    'signAndSendTransaction',
    'signIn',
  ];

  // Check if this is a Solana method that needs object params
  if (
    solanaMethodsThatUseObjects.includes(method) ||
    scope?.startsWith('solana:')
  ) {
    // For Solana, return params as-is (should be an object)
    return params;
  }

  // For EVM methods, ensure params is always an array
  let paramsArray = Array.isArray(params) ? params : [params];

  // Special handling for eth_signTypedData_v3/v4: second parameter must be JSON string
  if (
    (method === 'eth_signTypedData_v3' || method === 'eth_signTypedData_v4') &&
    paramsArray.length >= 2
  ) {
    const firstParam = paramsArray[0];
    const secondParam = paramsArray[1];

    if (firstParam !== undefined && secondParam !== undefined) {
      paramsArray = [
        firstParam, // address (string)
        typeof secondParam === 'string'
          ? secondParam
          : JSON.stringify(secondParam), // typed data (JSON string)
      ];
    }
  }

  return paramsArray;
};

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
export const updateInvokeMethodResults = (
  previousResults: InvokeMethodResults,
  scope: CaipChainId,
  method: string,
  result: Json | Error,
  request: Json,
): InvokeMethodResults => {
  const scopeResults = previousResults[scope] ?? {};
  const methodResults = scopeResults[method] ?? [];
  const newResults = {
    ...previousResults,
    [scope]: {
      ...scopeResults,
      [method]: [...methodResults, { result, request }],
    },
  };

  return newResults;
};

/**
 * Extracts the params from a wallet_invokeMethod request object.
 *
 * @param finalRequestObject - The full request object
 * @returns The params from the nested request
 */
export const extractRequestParams = (finalRequestObject: {
  params: { request: { params: Json } };
}): Json => {
  return finalRequestObject.params.request.params;
};

/**
 * Extracts the request object for storage from a wallet_invokeMethod request.
 *
 * @param finalRequestObject - The full request object
 * @returns The nested request object
 */
export const extractRequestForStorage = (finalRequestObject: {
  params: { request: Json };
}): Json => {
  return finalRequestObject.params.request;
};

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
export const autoSelectAccountForScope = (
  caipChainId: CaipChainId,
  currentSelectedAccount: CaipAccountId | null,
  currentSession: SessionData,
  setSelectedAccounts: Dispatch<
    SetStateAction<Record<string, CaipAccountId | null>>
  >,
): CaipAccountId | null => {
  if (currentSelectedAccount) {
    return currentSelectedAccount;
  }

  const scopeDetails = currentSession?.sessionScopes?.[caipChainId];
  const [firstAccount] = scopeDetails?.accounts ?? [];

  if (firstAccount) {
    console.log(
      `🔧 Auto-selecting first account for ${caipChainId}: ${String(
        firstAccount,
      )}`,
    );

    setSelectedAccounts((prev) => ({
      ...prev,
      [caipChainId]: firstAccount,
    }));

    return firstAccount;
  }

  console.error(`❌ No accounts available for scope ${caipChainId}`);
  return null;
};

/**
 * Prepares a method request object for invocation.
 *
 * @param method - The method name to invoke.
 * @param caipChainId - The CAIP chain ID.
 * @param selectedAccount - The selected account for this scope.
 * @param metamaskOpenrpcDocument - The MetaMask OpenRPC document.
 * @param injectParamsFn - Function to inject parameters for specific methods.
 * @param openRPCExampleToJSONFn - Function to convert OpenRPC examples to JSON.
 * @param methodsRequiringInjection - Object containing methods that require parameter injection.
 * @returns The prepared request object or null if method not found.
 */
export const prepareMethodRequest = (
  method: string,
  caipChainId: CaipChainId,
  selectedAccount: CaipAccountId | null,
  metamaskOpenrpcDocument: { methods: MethodObject[] },
  injectParamsFn: (
    method: string,
    params: Json,
    account: CaipAccountId,
    scope: CaipChainId,
  ) => Json,
  openRPCExampleToJSONFn: (methodObj: MethodObject) => Json,
  methodsRequiringInjection: Record<string, boolean>,
): Json | null => {
  const example = metamaskOpenrpcDocument?.methods.find(
    (methodObj: MethodObject) => methodObj.name === method,
  );

  if (!example) {
    console.error(`❌ No example found for method: ${method}`);
    return null;
  }

  let exampleParams: Json = openRPCExampleToJSONFn(example as MethodObject);

  if (method in methodsRequiringInjection && selectedAccount) {
    exampleParams = injectParamsFn(
      method,
      exampleParams,
      selectedAccount,
      caipChainId,
    );
  }

  return {
    method: 'wallet_invokeMethod',
    params: {
      scope: caipChainId,
      request: exampleParams,
    },
  };
};
