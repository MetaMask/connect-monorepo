/**
 * Returns the version of the Multichain SDK.
 *
 * @returns The version of the Multichain SDK.
 */
export function getVersion(): string {
  return '0.0.0';
}

export {
  classifyFailureReason,
  getWalletActionAnalyticsProperties,
  isRejectionError,
} from '../../multichain/utils/analytics';
export type { FailureReason } from '../../multichain/utils/analytics';
