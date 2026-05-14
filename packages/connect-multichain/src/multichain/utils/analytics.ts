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
 * Maximum length of `error_message_sample` after sanitisation. Mirrors the
 * `maxLength: 200` constraint declared in the analytics-api `api.spec.yml`.
 */
const ERROR_MESSAGE_SAMPLE_MAX_LENGTH = 200;

/**
 * Patterns scrubbed from `error_message_sample` before it leaves the SDK.
 * The goal is to surface enough error context for triage in Mixpanel
 * without leaking PII / wallet addresses / RPC endpoints / large numeric
 * quantities, across any chain the SDK might route to.
 *
 * Order matters. URLs are stripped early so address-shaped path segments
 * inside URLs aren't re-mangled by later passes. Specific patterns run
 * before broad ones (e.g. EVM `0x{40}` before the generic long-hex pass)
 * so the longer / more specific match wins. Bech32 runs before generic
 * Base58 because the two alphabets partially overlap — Bech32 includes
 * `0` (which Base58 excludes) and Base58 includes `o`/`i`/`b`/`l` (which
 * Bech32 excludes) — so running Base58 first can chop off the tail of an
 * HRP-prefixed Bech32 address at the first `l`/`i`/`o`/`b` and leave the
 * suffix unscrubbed. Decimal-number scrubbing runs last so it doesn't
 * fragment hex / Base58 tokens that contain digit runs.
 */
const SANITISE_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // EVM-style 20-byte hex addresses (e.g. `0x` + 40 hex chars).
  { pattern: /0x[a-fA-F0-9]{40}/gu, replacement: '<addr>' },
  // Other long hex blobs: tx hashes, signatures, raw byte strings, large
  // hex amounts. 16+ hex chars catches 32-byte hashes/signatures without
  // snagging EVM method selectors (8 chars) or short hex codes.
  { pattern: /(?:0x)?[a-fA-F0-9]{16,}/gu, replacement: '<hex>' },
  // URLs of any scheme up to the first whitespace / quote / closing paren.
  // Catches RPC endpoints, dapp deeplinks, query strings with secrets.
  { pattern: /https?:\/\/[^\s"')]+/gu, replacement: '<url>' },
  // Bech32 addresses: short HRP (1-10 lowercase chars) + `1` separator +
  // ≥38 chars of Bech32 data alphabet `[ac-hj-np-z02-9]` (excludes the
  // look-alike chars `b`, `i`, `o`, `1`). Covers Bitcoin SegWit
  // (`bc1…`/`tb1…`) and Cosmos-SDK chains (`cosmos1…`, `osmo1…`,
  // `juno1…`, `inj1…`, etc.) without enumerating every HRP. Runs before
  // the Base58 pattern below — see header comment for why.
  {
    pattern: /\b[a-z]{1,10}1[ac-hj-np-z02-9]{38,}\b/gu,
    replacement: '<addr>',
  },
  // Base58 tokens (32+ chars, Base58 alphabet `[1-9A-HJ-NP-Za-km-z]`).
  // Covers Solana pubkeys (32-44 chars), Solana tx signatures (~88 chars),
  // and Bitcoin Base58 addresses ≥32 chars. The 32-char floor and `\b`
  // word boundary keep English words and shorter alphanumerics safe.
  {
    pattern: /\b[1-9A-HJ-NP-Za-km-z]{32,}\b/gu,
    replacement: '<addr>',
  },
  // Long decimal numbers — token amounts, gas units, timestamps, lamports.
  // 10+ digits catches typical chain quantities without affecting JSON-RPC
  // codes (-32601, 4001, etc.) or short numeric IDs.
  { pattern: /\d{10,}/gu, replacement: '<num>' },
];

/**
 * Sanitises an error message for inclusion in analytics. Strips wallet
 * addresses (EVM hex, Solana / Bitcoin Base58, Bech32), long hex blobs,
 * URLs, and large decimal numbers, then truncates to
 * {@link ERROR_MESSAGE_SAMPLE_MAX_LENGTH} characters. Returns `undefined`
 * if there's no message to sample.
 *
 * @param message - Raw error message
 * @returns A safe-to-emit short string, or `undefined`
 */
export function sanitiseErrorMessage(
  message: string | undefined,
): string | undefined {
  if (!message) {
    return undefined;
  }
  let sanitised = message;
  for (const { pattern, replacement } of SANITISE_PATTERNS) {
    sanitised = sanitised.replace(pattern, replacement);
  }
  if (sanitised.length > ERROR_MESSAGE_SAMPLE_MAX_LENGTH) {
    // Trim and mark as truncated so consumers can tell vs. naturally short
    // messages. The trailing ellipsis fits inside the maxLength budget.
    sanitised = `${sanitised.slice(0, ERROR_MESSAGE_SAMPLE_MAX_LENGTH - 1)}…`;
  }
  return sanitised;
}

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
 * Bundle of diagnostic properties attached to `mmconnect_*_failed` events:
 * the bucketed {@link FailureReason}, the raw wallet-side error code if
 * present, and a sanitised sample of the original message. All three are
 * derived from a single error so producers only need to call this once.
 *
 * `error_code` and `error_message_sample` are intentionally optional —
 * many SDK-internal errors (e.g. `'Transport not initialized'`) have
 * neither a numeric code nor a useful message; in that case the caller
 * should attach only `failure_reason`.
 */
export type ErrorDiagnostics = {
  failure_reason: FailureReason;
  error_code?: number;
  error_message_sample?: string;
};

/**
 * Computes the full set of diagnostic properties to attach to a
 * `mmconnect_*_failed` event from a single error. Combines
 * {@link classifyFailureReason}, the unwrapped wallet code, and a
 * sanitised message sample so producer call sites stay a single line.
 *
 * @param error - The error to inspect
 * @returns Diagnostics ready to spread into the event properties
 */
export function extractErrorDiagnostics(error: unknown): ErrorDiagnostics {
  const failureReason = classifyFailureReason(error);
  const { code, message } = getUnwrappedErrorDetails(error);
  const messageSample = sanitiseErrorMessage(message);
  return {
    failure_reason: failureReason,
    ...(typeof code === 'number' ? { error_code: code } : {}),
    ...(messageSample ? { error_message_sample: messageSample } : {}),
  };
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
 * @param extra - Optional event-specific diagnostic properties. Used by
 * `mmconnect_wallet_action_failed` to attach the {@link ErrorDiagnostics}
 * bundle (`failure_reason`, `error_code`, `error_message_sample`).
 * @param extra.failure_reason - A short tag describing why the operation
 * failed; see `classifyFailureReason` and the `FailureReason` union.
 * @param extra.error_code - The raw wallet-side error code, if present.
 * @param extra.error_message_sample - A sanitised, truncated sample of the
 * original error message.
 * @returns Wallet action analytics properties
 */
export async function getWalletActionAnalyticsProperties(
  options: MultichainOptions,
  storage: StoreClient,
  invokeOptions: InvokeMethodOptions,
  transportType: TransportType,
  extra?: {
    failure_reason?: FailureReason;
    error_code?: number;
    error_message_sample?: string;
  },
): Promise<{
  mmconnect_versions: Record<string, string>;
  dapp_id: string;
  method: string;
  caip_chain_id: string;
  anon_id: string;
  transport_type: TransportType;
  failure_reason?: FailureReason;
  error_code?: number;
  error_message_sample?: string;
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
    ...(typeof extra?.error_code === 'number'
      ? { error_code: extra.error_code }
      : {}),
    ...(extra?.error_message_sample
      ? { error_message_sample: extra.error_message_sample }
      : {}),
  };
}
