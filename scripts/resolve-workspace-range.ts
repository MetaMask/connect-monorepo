/**
 * Resolves a Yarn `workspace:` protocol version range into a concrete semver
 * range by substituting the actual package version.
 *
 * @param range - The version range string, possibly prefixed with `workspace:`.
 * @param actualVersion - The concrete version of the workspace package.
 * @returns A standard semver range string.
 */
export function resolveWorkspaceRange(
  range: string | undefined,
  actualVersion: string,
): string {
  if (!range?.startsWith('workspace:')) {
    return range ?? '';
  }
  const specifier = range.replace('workspace:', '');
  if (specifier === '*') {
    return '*';
  }
  if (specifier === '^') {
    return `^${actualVersion}`;
  }
  if (specifier === '~') {
    return `~${actualVersion}`;
  }
  return specifier;
}
