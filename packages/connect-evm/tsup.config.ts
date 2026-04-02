/* eslint-disable @typescript-eslint/explicit-function-return-type -- Tsup config convention */
/* eslint-disable @typescript-eslint/naming-convention -- __PACKAGE_VERSION__ and __CONNECT_MULTICHAIN_PEER_VERSION_RANGE__ are esbuild define conventions */

import { defineConfig } from 'tsup';

import multichainPackageJson from '../connect-multichain/package.json';
import packageJson from './package.json';

const pkg: any = packageJson as any;
const multichainPkg: any = multichainPackageJson as any;

const deps = Object.keys(pkg.dependencies ?? {});
const peerDeps = Object.keys(pkg.peerDependencies ?? {});
const external = [...deps, ...peerDeps];
const entryName = pkg.name.replace('@metamask/', '');

function resolveWorkspaceRange(
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

const multichainPeerRange = resolveWorkspaceRange(
  pkg.peerDependencies?.['@metamask/connect-multichain'],
  multichainPkg.version,
);

export default defineConfig([
  {
    entry: { [entryName]: 'src/index.ts' },
    outDir: 'dist/browser/es',
    format: 'esm',
    platform: 'browser',
    bundle: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external,
    tsconfig: './tsconfig.json',
    define: {
      __PACKAGE_VERSION__: JSON.stringify(pkg.version),
      __CONNECT_MULTICHAIN_PEER_VERSION_RANGE__: JSON.stringify(
        multichainPeerRange,
      ),
    },
    esbuildOptions: (options) => {
      options.platform = 'browser';
      options.mainFields = ['browser', 'module', 'main'];
      options.conditions = ['browser'];
      options.outExtension = { '.js': '.mjs' };
    },
  },
  {
    entry: { index: 'src/index.ts' },
    outDir: 'dist/types',
    tsconfig: './tsconfig.types.json',
    dts: { only: true },
  },
]);
