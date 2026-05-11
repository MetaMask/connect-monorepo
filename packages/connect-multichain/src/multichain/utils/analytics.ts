/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unused-vars -- Scope type used in JSDoc */
import { getDappId } from '.';
import type {
  InvokeMethodOptions,
  MultichainOptions,
  PlatformType,
  Scope,
  StoreClient,
  TransportType,
} from '../../domain';
import { getPlatformType, RPCInvokeMethodErr } from '../../domain';

/**
 * Pulls the most informative `code` / `message` pair out of an error,
 * unwrapping `RPCInvokeMethodErr` so the wallet-side code (e.g. 4001) is
 * visible to classifiers instead of being hidden behind the SDK's static
 * `code: 53`. Falls back to the outer error if there is no inner wallet code.
 *
 * @param error - The error object to inspect
 * @returns The most relevant `{ code, message }` pair we can extract
 */
function getUnwrappedErrorDetails(error: unknown): {
  code: number | undefined;
  message: string;
} {
  if (typeof error !== 'object' || error === null) {
    return { code: undefined, message: '' };
  }

  if (error instanceof RPCInvokeMethodErr) {
    return {
      code: error.rpcCode ?? error.code,
      message: error.rpcMessage ?? error.message ?? '',
    };
  }

  const errorObj = error as { code?: number; message?: string };
  return {
    code: errorObj.code,
    message: errorObj.message ?? '',
  };
}

/**
 * Checks if an error represents a user rejection.
 *
 * Unwraps `RPCInvokeMethodErr` so the wallet's `code: 4001` survives the
 * SDK's transport-boundary wrapping (the outer error otherwise reports
 * `code: 53`, which would never match the heuristics here).
 *
 * @param error - The error object to check
 * @returns True if the error indicates a user rejection, false otherwise
 */
export function isRejectionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const { code, message } = getUnwrappedErrorDetails(error);
  const errorMessage = message.toLowerCase();

  // EIP-1193 4001 "User Rejected Request" is the canonical rejection code.
  // Note: 4100 "Unauthorized" is deliberately NOT matched here. On multichain
  // sessions it's what the CAIP-25 permission layer returns when a method
  // isn't in the granted scope (the layer rejects it before the method
  // handler runs). That's a permission/support signal, not a user-driven
  // rejection — misclassifying it as `_rejected` hides genuine permission
  // issues from `_failed`.
  return (
    code === 4001 ||
    errorMessage.includes('reject') ||
    errorMessage.includes('denied') ||
    errorMessage.includes('cancel') ||
    // Narrow "user …" matches — bare "user" is too greedy (catches Account
    // Abstraction errors like "user operation reverted").
    errorMessage.includes('user rejected') ||
    errorMessage.includes('user denied') ||
    errorMessage.includes('user cancelled') ||
    errorMessage.includes('user canceled')
  );
}

/**
 * Gets base analytics properties that are common across all events.
 *
 * @param options - Multichain options containing dapp and analytics config
 * @param storage - Storage client for getting anonymous ID
 * @returns Base analytics properties
 */
export async function getBaseAnalyticsProperties(
  options: MultichainOptions,
  storage: StoreClient,
): Promise<{
  mmconnect_versions: Record<string, string>;
  dapp_id: string;
  platform: PlatformType;
  anon_id: string;
}> {
  const dappId = getDappId(options.dapp);
  const platform = getPlatformType();
  const anonId = await storage.getAnonId();

  return {
    mmconnect_versions: options.versions ?? {},
    dapp_id: dappId,
    platform,
    anon_id: anonId,
  };
}

/**
 * Gets analytics properties specific to wallet action events.
 *
 * @param options - Multichain options containing dapp and analytics config
 * @param storage - Storage client for getting anonymous ID
 * @param invokeOptions - The invoke method options containing method and scope
 * @param transportType - The transport type to use for the analytics event
 * @returns Wallet action analytics properties
 */
export async function getWalletActionAnalyticsProperties(
  options: MultichainOptions,
  storage: StoreClient,
  invokeOptions: InvokeMethodOptions,
  transportType: TransportType,
): Promise<{
  mmconnect_versions: Record<string, string>;
  dapp_id: string;
  method: string;
  caip_chain_id: string;
  anon_id: string;
  transport_type: TransportType;
}> {
  const dappId = getDappId(options.dapp);
  const anonId = await storage.getAnonId();

  return {
    mmconnect_versions: options.versions ?? {},
    dapp_id: dappId,
    method: invokeOptions.request.method,
    caip_chain_id: invokeOptions.scope,
    anon_id: anonId,
    transport_type: transportType,
  };
}
