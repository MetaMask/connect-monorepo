// Inlined from `@metamask/chain-agnostic-permission@1.2.2` to avoid pulling
// its transitive `controller-utils` / `lodash` / `bn.js` / `eth-ens-namehash`
// chain into every consumer's `connect-evm` bundle (e.g. wagmi → LiFi).
// Built on `@metamask/utils` primitives; semantics are identical to upstream.
//
// Upstream sources (pinned to commit `82aec7d`):
// - `parseScopeString`: https://github.com/MetaMask/core/blob/82aec7d537f0cca3663c44c17e1560f6e00c9b8c/packages/chain-agnostic-permission/src/scope/types.ts#L93-L107
// - `getEthAccounts`: https://github.com/MetaMask/core/blob/82aec7d537f0cca3663c44c17e1560f6e00c9b8c/packages/chain-agnostic-permission/src/operators/caip-permission-operator-accounts.ts#L77-L91
// - `getPermittedEthChainIds`: https://github.com/MetaMask/core/blob/82aec7d537f0cca3663c44c17e1560f6e00c9b8c/packages/chain-agnostic-permission/src/operators/caip-permission-operator-permittedChains.ts#L43-L58
//
// If upstream changes semantics, mirror the change and bump the pinned commit.
// Revisit if upstream ever splits `controller-utils` so the dep becomes cheap.

import type { SessionData } from '@metamask/connect-multichain';
import {
  isCaipChainId,
  isCaipNamespace,
  KnownCaipNamespace,
  parseCaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';

import type { Address, Hex } from '../types';

/**
 * Result of parsing a CAIP scope string.
 */
type ParsedScope = {
  namespace?: string;
  reference?: string;
};

/**
 * Parses a CAIP-217 scope string (`namespace` or `namespace:reference`) into
 * its components. See file header for upstream reference.
 *
 * @param scopeString - The scope string to parse.
 * @returns An object containing `namespace` and (optionally) `reference`.
 * Returns an empty object if the input is neither a valid CAIP namespace nor
 * a valid CAIP-2 chain ID.
 */
export const parseScopeString = (scopeString: string): ParsedScope => {
  if (isCaipNamespace(scopeString)) {
    return { namespace: scopeString };
  }
  if (isCaipChainId(scopeString)) {
    return parseCaipChainId(scopeString);
  }
  return {};
};

/**
 * Returns true if the scope string is either an `eip155:*` chain scope or the
 * `wallet:eip155` cross-chain wallet scope.
 *
 * @param scopeString - The scope string to check.
 * @returns True if EIP-155-namespaced.
 */
const isEip155ScopeString = (scopeString: string): boolean => {
  const { namespace } = parseScopeString(scopeString);
  return (
    namespace === KnownCaipNamespace.Eip155 ||
    scopeString === `${KnownCaipNamespace.Wallet}:${KnownCaipNamespace.Eip155}`
  );
};

/**
 * Returns true if the value is a `0x`-prefixed strict hex string.
 *
 * @param value - The value to check.
 * @returns True if `value` matches `/^0x[0-9a-fA-F]+$/`.
 */
const isStrictHexString = (value: string): value is Hex =>
  /^0x[0-9a-fA-F]+$/u.test(value);

/**
 * Converts a CAIP-2 EIP-155 `reference` (decimal string, e.g. `"137"`) into a
 * `0x`-prefixed hex chain ID. Tolerates already-hex inputs to mirror
 * `@metamask/controller-utils.toHex`. Uses `BigInt` so chain IDs larger than
 * `Number.MAX_SAFE_INTEGER` (e.g. some experimental chains) are handled
 * correctly.
 *
 * @param reference - The CAIP-2 reference component of an `eip155` scope.
 * @returns The reference as a `0x`-prefixed hex string.
 */
const referenceToHexChainId = (reference: string): Hex => {
  if (isStrictHexString(reference)) {
    return reference;
  }
  return `0x${BigInt(reference).toString(16)}`;
};

/**
 * Get the unique Ethereum (EIP-155) accounts from the session scopes.
 *
 * Walks every scope's `accounts` array, keeps CAIP-10 account IDs whose chain
 * is EIP-155 (or the `wallet:eip155` cross-chain wallet scope), and returns
 * the unique 0x addresses.
 *
 * @param sessionScopes - The session scopes from `wallet_createSession` /
 * `wallet_getSession` / `wallet_sessionChanged`.
 * @returns The unique Ethereum addresses across all EIP-155 scopes.
 */
export const getEthAccounts = (
  sessionScopes: SessionData['sessionScopes'] | undefined,
): Address[] => {
  if (!sessionScopes) {
    return [];
  }

  const ethAccounts: Address[] = [];
  for (const { accounts } of Object.values(sessionScopes)) {
    if (!accounts) {
      continue;
    }
    for (const account of accounts) {
      const { address, chainId } = parseCaipAccountId(account);
      if (isEip155ScopeString(chainId) && isStrictHexString(address)) {
        ethAccounts.push(address);
      }
    }
  }

  return Array.from(new Set(ethAccounts));
};

/**
 * Get the unique permitted Ethereum (EIP-155) chain IDs from the session
 * scopes.
 *
 * Iterates the scope keys, keeps the `eip155:<reference>` ones, converts each
 * decimal `reference` to a `0x`-prefixed hex chain ID, and returns the unique
 * set.
 *
 * @param sessionScopes - The session scopes from `wallet_createSession` /
 * `wallet_getSession` / `wallet_sessionChanged`.
 * @returns The unique EIP-155 chain IDs as `0x`-prefixed hex strings.
 */
export const getPermittedEthChainIds = (
  sessionScopes: SessionData['sessionScopes'] | undefined,
): Hex[] => {
  if (!sessionScopes) {
    return [];
  }

  const ethChainIds: Hex[] = [];
  for (const scopeString of Object.keys(sessionScopes)) {
    const { namespace, reference } = parseScopeString(scopeString);
    if (namespace === KnownCaipNamespace.Eip155 && reference) {
      ethChainIds.push(referenceToHexChainId(reference));
    }
  }

  return Array.from(new Set(ethChainIds));
};
