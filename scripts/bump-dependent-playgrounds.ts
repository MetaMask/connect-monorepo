#!yarn tsx

import execa from 'execa';
import fs from 'fs';
import path from 'path';
import semver from 'semver';

/**
 * Playground packages that should be auto-bumped when their workspace
 * dependencies are released.
 */
const AUTO_BUMP_PLAYGROUNDS = [
  'playground/browser-playground',
  'playground/react-native-playground',
];

type PackageManifest = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type ReleasedPackage = {
  name: string;
  version: string;
};

/**
 * Main entry point for the script.
 *
 * This script detects which workspace packages are being released (have version
 * bumps without corresponding git tags) and automatically bumps the patch version
 * of playground packages that depend on them.
 *
 * This is intended to be run on a release branch after `yarn create-release-branch -i`
 * has been used to bump package versions.
 */
async function main(): Promise<void> {
  const packagesToRelease = await getPackagesToRelease();

  if (packagesToRelease.length === 0) {
    console.log(
      'No packages pending release detected. Make sure you have run `yarn create-release-branch -i` first.',
    );
    return;
  }

  console.log('Packages pending release detected:');
  for (const pkg of packagesToRelease) {
    console.log(`  - ${pkg.name}@${pkg.version}`);
  }

  const bumpedPlaygrounds: string[] = [];

  for (const playgroundPath of AUTO_BUMP_PLAYGROUNDS) {
    const wasBumped = await bumpPlaygroundIfNeeded(
      playgroundPath,
      packagesToRelease,
    );
    if (wasBumped) {
      bumpedPlaygrounds.push(playgroundPath);
    }
  }

  if (bumpedPlaygrounds.length > 0) {
    console.log('\nBumped playground packages:');
    for (const playground of bumpedPlaygrounds) {
      console.log(`  - ${playground}`);
    }
    console.log(
      '\nDone! Review the changes and commit them to include in the release.',
    );

    // Output for GitHub Actions (if running in CI)
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      fs.appendFileSync(
        outputFile,
        `bumped_playgrounds=${bumpedPlaygrounds.join(',')}\n`,
      );
    }
  } else {
    console.log('\nNo playground packages needed bumping.');
  }
}

/**
 * Gets the list of packages that are pending release.
 *
 * This is determined by looking at packages in the packages/ directory
 * whose current version in package.json does NOT have a corresponding git tag.
 * This indicates the version was bumped by `create-release-branch` and is
 * awaiting release.
 *
 * @returns Array of packages pending release with their names and versions.
 */
async function getPackagesToRelease(): Promise<ReleasedPackage[]> {
  const pendingRelease: ReleasedPackage[] = [];

  // Get all workspace packages (excluding playgrounds and private packages)
  const { stdout } = await execa('yarn', [
    'workspaces',
    'list',
    '--no-private',
    '--json',
  ]);

  const workspaces = stdout.split('\n').map((line) => JSON.parse(line));

  // Filter to only packages in packages/ directory (not playground/)
  const corePackages = workspaces.filter((ws: { location: string }) =>
    ws.location.startsWith('packages/'),
  );

  for (const workspace of corePackages) {
    const manifestPath = path.join(workspace.location, 'package.json');
    const rawManifest = await fs.promises.readFile(manifestPath, 'utf8');
    const manifest: PackageManifest = JSON.parse(rawManifest);

    // Check if there's NO git tag for this version (meaning it's pending release)
    const tagName = `${manifest.name}@${manifest.version}`;
    try {
      await execa('git', ['rev-parse', `refs/tags/${tagName}`]);
      // Tag exists, this package version was already released
    } catch {
      // Tag doesn't exist, this package is pending release
      pendingRelease.push({ name: manifest.name, version: manifest.version });
    }
  }

  return pendingRelease;
}

/**
 * Checks if a playground package depends on any of the packages pending release
 * and bumps its version if so.
 *
 * @param playgroundPath - The path to the playground package.
 * @param packagesToRelease - The list of packages pending release.
 * @returns True if the playground was bumped, false otherwise.
 */
async function bumpPlaygroundIfNeeded(
  playgroundPath: string,
  packagesToRelease: ReleasedPackage[],
): Promise<boolean> {
  const manifestPath = path.join(playgroundPath, 'package.json');
  const rawManifest = await fs.promises.readFile(manifestPath, 'utf8');
  const manifest: PackageManifest = JSON.parse(rawManifest);

  // Find workspace dependencies that are being released
  const allDeps = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  };

  const updatedDeps: string[] = [];
  for (const pkg of packagesToRelease) {
    const depVersion = allDeps[pkg.name];
    if (depVersion?.startsWith('workspace:')) {
      updatedDeps.push(`${pkg.name}@${pkg.version}`);
    }
  }

  if (updatedDeps.length === 0) {
    console.log(
      `\n${manifest.name}: No workspace dependencies are being released.`,
    );
    return false;
  }

  console.log(
    `\n${manifest.name}: Found workspace dependencies being released:`,
  );
  for (const dep of updatedDeps) {
    console.log(`  - ${dep}`);
  }

  // Bump patch version
  const currentVersion = manifest.version;
  const newVersion = semver.inc(currentVersion, 'patch');

  if (!newVersion) {
    throw new Error(
      `Failed to bump version for ${manifest.name}: invalid version ${currentVersion}`,
    );
  }

  console.log(`  Bumping version: ${currentVersion} -> ${newVersion}`);

  // Update package.json
  manifest.version = newVersion;
  await fs.promises.writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  // Update CHANGELOG.md
  await updateChangelog(playgroundPath, manifest.name, newVersion, updatedDeps);

  return true;
}

/**
 * Updates the CHANGELOG.md file for a playground package.
 *
 * @param playgroundPath - The path to the playground package.
 * @param packageName - The name of the package.
 * @param newVersion - The new version of the package.
 * @param updatedDeps - The list of updated dependencies.
 */
async function updateChangelog(
  playgroundPath: string,
  packageName: string,
  newVersion: string,
  updatedDeps: string[],
): Promise<void> {
  const changelogPath = path.join(playgroundPath, 'CHANGELOG.md');
  let changelog = await fs.promises.readFile(changelogPath, 'utf8');

  const depsList = updatedDeps.map((dep) => `  - ${dep}`).join('\n');

  // Find the [Unreleased] section and add new version after it
  const unreleasedPattern = /## \[Unreleased\]\n/u;
  const newVersionSection = `## [Unreleased]

## [${newVersion}]

### Changed

- Bump workspace dependencies:
${depsList}

`;

  changelog = changelog.replace(unreleasedPattern, newVersionSection);

  // Update the links at the bottom
  const unreleasedLinkPattern = new RegExp(
    `\\[Unreleased\\]: (https://github\\.com/MetaMask/connect-monorepo/compare/${packageName.replace('/', '\\/')}@)[\\d.]+\\.\\.\\.HEAD`,
  );

  // Check if we need to update or add the unreleased link
  if (unreleasedLinkPattern.test(changelog)) {
    changelog = changelog.replace(
      unreleasedLinkPattern,
      `[Unreleased]: $1${newVersion}...HEAD`,
    );
  }

  if (!changelog.includes(`[${newVersion}]:`)) {
    // Find where to insert the new version link
    const existingVersionLinks = changelog.match(/\[\d+\.\d+\.\d+\]: .+/g);
    if (existingVersionLinks && existingVersionLinks.length > 0) {
      const firstLink = existingVersionLinks[0];
      if (firstLink) {
        const previousVersionMatch = firstLink.match(/\[(\d+\.\d+\.\d+)\]/);
        if (previousVersionMatch) {
          const prevVersion = previousVersionMatch[1];
          const newVersionLink = `[${newVersion}]: https://github.com/MetaMask/connect-monorepo/compare/${packageName}@${prevVersion}...${packageName}@${newVersion}\n`;
          changelog = changelog.replace(
            firstLink,
            `${newVersionLink}${firstLink}`,
          );
        }
      }
    }
  }

  await fs.promises.writeFile(changelogPath, changelog);
  console.log(`  Updated CHANGELOG.md`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
