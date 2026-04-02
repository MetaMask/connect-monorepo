/* eslint-disable @typescript-eslint/naming-convention -- __PACKAGE_VERSION__ is an esbuild define convention */

// Value substituted by tsup at build time
declare const __PACKAGE_VERSION__: string | undefined;

// typeof guard needed: Metro (React Native) bundles TS source directly,
// bypassing the tsup build that substitutes __PACKAGE_VERSION__.
export const packageVersion: string =
  typeof __PACKAGE_VERSION__ === 'undefined' ? 'unknown' : __PACKAGE_VERSION__;

/**
 * Returns the version of the Multichain SDK.
 *
 * @returns The version of the Multichain SDK.
 */
export function getVersion(): string {
  return packageVersion;
}

export {
  getWalletActionAnalyticsProperties,
  isRejectionError,
} from '../../multichain/utils/analytics';
