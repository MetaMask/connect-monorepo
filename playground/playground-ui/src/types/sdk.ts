import type { CaipAccountId, CaipChainId, Json } from '@metamask/utils';
import type { Dispatch, SetStateAction } from 'react';

/**
 * Session scope data containing accounts and methods.
 */
export type SessionScopeData = {
  accounts?: CaipAccountId[];
  methods?: string[];
  notifications?: string[];
};

/**
 * Session data structure for multichain connections.
 */
export type SessionData = {
  sessionScopes?: Record<CaipChainId, SessionScopeData>;
};

/**
 * Result of a method invocation.
 */
export type InvokeMethodResult = {
  result: Json | Error;
  request: Json;
};

/**
 * State for storing invoke method results by scope and method.
 */
export type InvokeMethodResults = Record<
  string,
  Record<string, InvokeMethodResult[]>
>;

/**
 * Selected accounts state by scope.
 */
export type SelectedAccountsState = Record<string, CaipAccountId | null>;

/**
 * Function to update selected accounts state.
 */
export type SetSelectedAccountsFn = Dispatch<
  SetStateAction<SelectedAccountsState>
>;
