import pkg from '../../package.json';

export type ConnectPackageName =
  | 'connect-multichain'
  | 'connect-evm'
  | 'connect-solana';

/**
 * connect-multichain is always present; the chain-specific packages
 * appear only when their module has been loaded (i.e. the consumer
 * actually uses them).
 */
export type ConnectVersions = Pick<
  Record<ConnectPackageName, string>,
  'connect-multichain'
> &
  Partial<Record<Exclude<ConnectPackageName, 'connect-multichain'>, string>>;

const versionRegistry = new Map<ConnectPackageName, string>();

/**
 * Registers a package version in the global version registry.
 * Called at module-load time by each connect package.
 *
 * @param name - The connect package identifier.
 * @param version - The semver version string to register.
 */
export function registerPackageVersion(
  name: ConnectPackageName,
  version: string,
): void {
  versionRegistry.set(name, version);
}

/**
 * Returns a snapshot of all currently registered package versions.
 * Only packages whose modules have been loaded will be present;
 * connect-multichain is always included because it self-registers
 * at the bottom of this file.
 *
 * @returns An object keyed by ConnectPackageName with version strings.
 */
export function getVersions(): ConnectVersions {
  return Object.fromEntries(versionRegistry) as ConnectVersions;
}

registerPackageVersion('connect-multichain', pkg.version);
