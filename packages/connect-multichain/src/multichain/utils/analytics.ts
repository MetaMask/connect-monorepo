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
 * Tag describing the cause of a failed wallet action / connection. Surfaced
 * as the `failure_reason` property on `mmconnect_wallet_action_failed` and
 * `mmconnect_connection_failed` events so we can distinguish e.g. a transport
 * timeout from a wallet-side internal error in Mixpanel.
 *
 * Intentionally a string union (not a const enum) so callers stay free to
 * pass through a new bucket; the schema-side property is an open string for
 * the same reason.
 */
export type FailureReason =
  | 'transport_timeout'
  | 'transport_disconnect'
  | 'wallet_method_unsupported'
  | 'wallet_invalid_params'
  | 'wallet_internal_error'
  | 'wallet_unauthorized'
  | 'unrecognised_chain'
  | 'unknown';

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
 * @param error - The error object to check
 * @returns True if the error indicates a user rejection, false otherwise
 */
export function isRejectionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const errorObj = error as { code?: number; message?: string };
  const errorCode = errorObj.code;
  const errorMessage = errorObj.message?.toLowerCase() ?? '';

  return (
    errorCode === 4001 || // User rejected request (common EIP-1193 code)
    errorCode === 4100 || // Unauthorized (common rejection code)
    errorMessage.includes('reject') ||
    errorMessage.includes('denied') ||
    errorMessage.includes('cancel') ||
    errorMessage.includes('user')
  );
}

/**
 * Classifies a failed wallet action / connection error into a short tag for
 * the `failure_reason` analytics property. Caller is expected to have already
 * established that the error is *not* a user rejection (use `isRejectionError`
 * for that branching).
 *
 * The taxonomy is deliberately producer-side-only — the schema accepts any
 * string — so we can add buckets here without an API migration. Once the
 * distribution stabilises we may convert the schema field to a closed enum.
 *
 * @param error - The error to classify
 * @returns A short, snake_case tag describing why the operation failed
 */
export function classifyFailureReason(error: unknown): FailureReason {
  if (typeof error !== 'object' || error === null) {
    return 'unknown';
  }

  const errorObj = error as { name?: string; message?: string };
  const errorName = errorObj.name ?? '';
  const errorMessageRaw = errorObj.message ?? '';
  const errorMessage = errorMessageRaw.toLowerCase();

  // Wallet-side JSON-RPC / EIP-1193 code is the strongest signal we have —
  // check it before any message-substring heuristics so a wallet error like
  // `{ code: 4900, message: 'Disconnected' }` doesn't get caught by the
  // transport-disconnect text match below. Unwraps `RPCInvokeMethodErr` so
  // the wallet's actual error code is visible.
  const { code } = getUnwrappedErrorDetails(error);
  if (typeof code === 'number') {
    // JSON-RPC 2.0 + EIP-1474 standard codes.
    if (code === -32601) {
      return 'wallet_method_unsupported';
    }
    if (code === -32602) {
      return 'wallet_invalid_params';
    }
    if (code === -32603) {
      return 'wallet_internal_error';
    }
    // Standard JSON-RPC server error range.
    if (code <= -32000 && code >= -32099) {
      return 'wallet_internal_error';
    }
    // EIP-1193 named provider codes — handled individually. Codes in the
    // 1000–4999 range that aren't matched here fall through to `unknown`.
    if (code === 4100) {
      // Unauthorized — most commonly fires when a method isn't in the
      // CAIP-25 scope's granted methods list (the multichain permission
      // layer rejects it before the method handler runs). Distinct from
      // a user rejection (4001) and worth tracking separately.
      return 'wallet_unauthorized';
    }
    if (code === 4200) {
      // Unsupported method — wallet handler exists but explicitly refuses.
      return 'wallet_method_unsupported';
    }
    if (code === 4902) {
      // Unrecognized chain ID — `wallet_switchEthereumChain` to a chain the
      // wallet hasn't been told about. Same signal as the message heuristic
      // below, but reaches us cleanly via code rather than substring.
      return 'unrecognised_chain';
    }
    // Anything else in the EIP-1193 / EIP-1474 provider-defined range
    // (1000–4999) falls through to `unknown` — we can promote specific codes
    // into their own buckets later as the distribution stabilises, without a
    // schema migration. Two buckets for "we don't know what this is" adds
    // noise without insight.
  }

  // Transport-layer errors. Two shapes exist:
  // - `TransportTimeoutError` from `@metamask/multichain-api-client` (used by
  //   MWP and the warmup paths of the default extension transport). It's a
  //   subclass of `TransportError` so we match on the name field rather than
  //   importing the symbol (the type lives in a runtime dependency that the
  //   analytics utils shouldn't pull in directly).
  // - A plain `new Error('Request timeout')` thrown by `DefaultTransport`'s
  //   own setTimeout. Indistinguishable from other errors without the message.
  if (
    errorName === 'TransportTimeoutError' ||
    errorMessageRaw === 'Request timeout' ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('timeout')
  ) {
    return 'transport_timeout';
  }
  // Transport disconnect. Narrowed substring set so we don't snag wallet
  // error messages that happen to contain "disconnect" (e.g. EIP-1193
  // `4900 Disconnected`, which the wallet-code branch above already routed
  // to `unknown` per policy).
  if (
    errorName === 'TransportError' ||
    errorMessage.includes('not connected') ||
    errorMessage.includes('transport disconnect') ||
    errorMessage.includes('connection lost') ||
    errorMessage.includes('socket closed')
  ) {
    return 'transport_disconnect';
  }

  if (errorMessage.includes('unrecognized chain')) {
    return 'unrecognised_chain';
  }

  return 'unknown';
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
 * @param extra - Optional event-specific properties. Today only used to
 * attach a `failure_reason` tag to `mmconnect_wallet_action_failed` events.
 * @param extra.failure_reason - A short tag describing why the operation
 * failed; see `classifyFailureReason` and the `FailureReason` union.
 * @returns Wallet action analytics properties
 */
export async function getWalletActionAnalyticsProperties(
  options: MultichainOptions,
  storage: StoreClient,
  invokeOptions: InvokeMethodOptions,
  transportType: TransportType,
  extra?: { failure_reason?: FailureReason },
): Promise<{
  mmconnect_versions: Record<string, string>;
  dapp_id: string;
  method: string;
  caip_chain_id: string;
  anon_id: string;
  transport_type: TransportType;
  failure_reason?: FailureReason;
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
    ...(extra?.failure_reason ? { failure_reason: extra.failure_reason } : {}),
  };
}
