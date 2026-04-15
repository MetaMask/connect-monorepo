/**
 * Resolves a Yarn `workspace:` protocol version range into a real semver range.
 *
 * @param range - The version range string, possibly using `workspace:` protocol.
 * @param actualVersion - The concrete version of the workspace package.
 * @returns A resolved semver range string.
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
