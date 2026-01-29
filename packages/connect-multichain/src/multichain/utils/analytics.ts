/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unused-vars -- Scope type used in JSDoc */
import { getDappId } from '.';
import type {
  InvokeMethodOptions,
  MultichainOptions,
  PlatformType,
  Scope,
  StoreClient,
} from '../../domain';
import { getPlatformType, getVersion, TransportType } from '../../domain';

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
  mmconnect_version: string;
  dapp_id: string;
  platform: PlatformType;
  integration_type: string;
  anon_id: string;
}> {
  const version = getVersion();
  const dappId = getDappId(options.dapp);
  const platform = getPlatformType();
  const anonId = await storage.getAnonId();
  const integrationType =
    (options.analytics as { enabled: true; integrationType: string })
      ?.integrationType ?? TransportType.UNKNOWN;

  return {
    mmconnect_version: version,
    dapp_id: dappId,
    platform,
    integration_type: integrationType,
    anon_id: anonId,
  };
}

/**
 * Gets analytics properties specific to wallet action events.
 *
 * @param options - Multichain options containing dapp and analytics config
 * @param storage - Storage client for getting anonymous ID
 * @param invokeOptions - The invoke method options containing method and scope
 * @returns Wallet action analytics properties
 */
export async function getWalletActionAnalyticsProperties(
  options: MultichainOptions,
  storage: StoreClient,
  invokeOptions: InvokeMethodOptions,
): Promise<{
  mmconnect_version: string;
  dapp_id: string;
  method: string;
  integration_type: string;
  caip_chain_id: string;
  anon_id: string;
}> {
  const version = getVersion();
  const dappId = getDappId(options.dapp);
  const anonId = await storage.getAnonId();
  const integrationType =
    (options.analytics as { enabled: true; integrationType: string })
      ?.integrationType ?? 'unknown';

  return {
    mmconnect_version: version,
    dapp_id: dappId,
    method: invokeOptions.request.method,
    integration_type: integrationType,
    caip_chain_id: invokeOptions.scope,
    anon_id: anonId,
  };
}
