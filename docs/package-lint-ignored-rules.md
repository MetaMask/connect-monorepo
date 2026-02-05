# Package Lint Ignored Rules

This document explains the `yarn lint:package-config` warnings and why certain rules are ignored in the `attw` (Are The Types Wrong) configuration.

## Overview

The `yarn lint:package-config` command runs two tools:

- **publint**: Validates package.json configuration for npm publishing
- **attw**: Checks TypeScript type declarations for module resolution issues

All packages now pass exit code 0, but some warnings remain. These warnings are intentionally ignored because they represent edge cases that don't affect real-world usage.

---

## Ignored Rules Configuration

Each package's `attw` script includes `--ignore-rules` to skip expected warnings:

| Package                        | Ignored Rules                                            |
| ------------------------------ | -------------------------------------------------------- |
| `@metamask/analytics`          | `false-cjs`, `no-resolution`                             |
| `@metamask/connect`            | `false-cjs`, `no-resolution`                             |
| `@metamask/connect-evm`        | `false-cjs`, `no-resolution`                             |
| `@metamask/connect-multichain` | `false-cjs`, `no-resolution`                             |
| `@metamask/connect-solana`     | `false-cjs`, `no-resolution`, `cjs-resolves-to-esm`      |
| `@metamask/multichain-ui`      | `false-cjs`, `no-resolution`, `unexpected-module-syntax` |

---

## Rule Explanations

### 1. `false-cjs` (Masquerading as CJS)

**What it means:**

The `.d.ts` type declaration files are interpreted as CommonJS by TypeScript when using `moduleResolution: "node16"` or `"nodenext"`, even though the corresponding `.mjs` JavaScript files are ESM. This creates a theoretical mismatch between the module format of types and runtime code.

**Example warning:**

```
pkg.exports["."].import.types types is interpreted as CJS when resolving
with the "import" condition. Consider using the .mts extension.
```

**Why it's acceptable:**

1. **Bundler environments (99% of consumers):** Webpack, Vite, esbuild, Rollup, and other bundlers don't care about this distinction. They resolve types and code independently and handle the interop correctly.

2. **Real-world impact is minimal:** This issue only manifests when ALL of these conditions are met simultaneously:
   - Running in Node.js directly (not through a bundler like webpack/vite/esbuild)
   - Using `moduleResolution: "node16"` or `"nodenext"` in tsconfig (stricter than the common `"bundler"` setting)
   - TypeScript then interprets the `.d.ts` types as CJS while the `.mjs` runtime is ESM

   Most real-world consumers use bundlers, which handle module interop seamlessly regardless of file extensions.

3. **The fix is complex:** Properly fixing this requires:
   - Generating separate `.d.mts` (ESM types) and `.d.cts` (CJS types) files
   - Restructuring package.json exports with separate type conditions
   - Updating build tooling (tsup/TypeScript configuration)
   - This significantly increases build complexity for marginal benefit

4. **Industry standard:** Many popular packages (React, Vue, Angular, Lodash) have this same "issue" and function perfectly in practice.

**Technical details:**

The issue arises because TypeScript determines module format from file extension:

- `.d.ts` → interpreted as CJS types
- `.d.mts` → interpreted as ESM types
- `.d.cts` → interpreted as CJS types

When you have `.d.ts` files paired with `.mjs` runtime files, TypeScript sees a format mismatch in strict module resolution modes.

---

### 2. `no-resolution` (Resolution Failed for node10)

**What it means:**

When using Node.js 10's legacy module resolution algorithm, the package's subpath exports (like `@metamask/connect/evm`) can't be resolved.

**Example warning:**

```
Resolution failed for "@metamask/connect/evm" in node10 mode
```

**Why it's acceptable:**

1. **Node 10 reached End-of-Life on April 30, 2021** - over 4 years ago. Security updates stopped, and it's no longer maintained.

2. **Node 10 doesn't support subpath exports** in `package.json` - this is a fundamental limitation of that Node version, not a bug in the package. The `exports` field was introduced in Node 12.7.0.

3. **The monorepo requires Node 20.19.0+** as specified in `engines.node`, so Node 10 was never a supported runtime.

4. **No modern tooling targets Node 10:**
   - TypeScript 5.x requires Node 14.17+
   - All current bundlers work with modern resolution algorithms
   - npm 7+ (which uses Node 10+) understands exports

5. **Backward compatibility is impossible:** Supporting Node 10 would require removing the `exports` field entirely, which would break modern module resolution for all current consumers.

---

### 3. `cjs-resolves-to-esm` (CJS Resolves to ESM)

**What it means:**

When a CommonJS file tries to `require('@metamask/connect-solana')`, it resolves to an ESM file (`.mjs`), which will throw an error in Node.js because synchronous `require()` can't load ESM modules.

**Example warning:**

```
A require call resolved to an ESM JavaScript file, which is an error in Node
and some bundlers. CommonJS consumers will need to use a dynamic import.
```

**Why it's acceptable for `@metamask/connect-solana`:**

1. **Intentionally built as browser-only:** The tsup configuration explicitly targets browsers:

   ```typescript
   // tsup.config.ts
   {
     outDir: 'dist/browser/es',     // Browser-specific output path
     platform: 'browser',            // Explicitly browser platform
     esbuildOptions: (options) => {
       options.platform = 'browser';
       options.mainFields = ['browser', 'module', 'main'];
       options.conditions = ['browser'];
     },
   }
   ```

2. **Wallet connection is a browser use case:** The package provides MetaMask wallet connectivity for Solana using the [Wallet Standard](https://github.com/wallet-standard/wallet-standard) - an API designed for browser extensions and web applications. There is no server-side use case for connecting to a browser wallet extension.

3. **Dependencies support CJS, but that's irrelevant here:** While the dependencies (`@solana/web3.js`, `@wallet-standard/base`, `@metamask/solana-wallet-standard`) do support CJS, this package itself is only useful in browser contexts where wallet extensions exist.

4. **CJS consumers can use dynamic import:** If an unusual use case emerges, CJS consumers can still use:

   ```javascript
   // Instead of: const solana = require('@metamask/connect-solana');
   const solana = await import('@metamask/connect-solana');
   ```

5. **Avoids unnecessary build complexity:** Adding a CJS build for a non-existent use case increases:
   - Build time
   - Bundle size (shipping both formats)
   - Maintenance burden
   - Potential for bugs in the rarely-tested CJS path

**How to fix (if needed):**

If CJS support becomes necessary, update `tsup.config.ts`:

```typescript
export default defineConfig([
  // Existing ESM build
  {
    entry: { [entryName]: 'src/index.ts' },
    outDir: 'dist/browser/es',
    format: 'esm',
    // ... rest of config
  },
  // Add CJS build
  {
    entry: { [entryName]: 'src/index.ts' },
    outDir: 'dist/node/cjs',
    format: 'cjs',
    platform: 'node',
    bundle: true,
    splitting: false,
    sourcemap: true,
    external,
    tsconfig: './tsconfig.json',
    esbuildOptions: (o) => {
      o.platform = 'node';
      o.mainFields = ['module', 'main'];
      o.conditions = ['node'];
      o.outExtension = { '.js': '.js' };
    },
  },
  // Existing types build
  // ...
]);
```

Then update `package.json`:

```json
"exports": {
  ".": {
    "import": {
      "types": "./dist/types/index.d.ts",
      "default": "./dist/browser/es/connect-solana.mjs"
    },
    "require": {
      "types": "./dist/types/index.d.ts",
      "default": "./dist/node/cjs/connect-solana.js"
    },
    "default": {
      "types": "./dist/types/index.d.ts",
      "default": "./dist/node/cjs/connect-solana.js"
    }
  }
}
```

---

### 4. `unexpected-module-syntax` (Unexpected Module Syntax)

**What it means:**

The JavaScript files contain ESM syntax (`import`/`export`) but are interpreted as CJS because the `package.json` has `"type": "commonjs"` and the files use `.js` extension instead of `.mjs`.

**Example warning:**

```
Syntax detected in the module is incompatible with the module kind according
to the package.json or file extension.
```

**Why it's acceptable for `@metamask/multichain-ui`:**

1. **Stencil tooling limitation:** multichain-ui is built with Stencil (a web components compiler), which outputs ESM code with `.js` extensions by design. This is how Stencil's build system works.

2. **Bundlers handle it correctly:** When consumed through a bundler (which is how web components are typically used), the bundler:
   - Reads the actual module syntax in the file
   - Ignores the file extension
   - Handles it appropriately as ESM

3. **Changing would break Stencil:** Modifying Stencil's output format would require:
   - Forking or heavily customizing Stencil
   - Maintaining custom build scripts
   - Potential breakage on Stencil updates

4. **Web components are browser-only:** Like connect-solana, this package is consumed in browser environments where:
   - Bundlers are universal
   - Native ESM works correctly
   - The file extension is irrelevant

5. **Node.js consumption is not intended:** If someone tries to use this in Node.js directly (without a bundler), they would encounter issues, but that's not a supported use case for a web components library.

---

## Remaining publint Warnings

These warnings appear in publint output but don't cause failures:

### TypeScript Declaration Files Interpreted as CJS

Same as the `false-cjs` rule above. publint warns about this, but it's safe to ignore for the same reasons.

### `pkg.browser` Field Suggestion (connect-solana)

**Warning:**

```
pkg.browser with a string value can be refactored to use pkg.exports
and the "browser" condition
```

**Why it's acceptable:**

- The current setup works correctly
- Changing would be a breaking change for consumers
- The `exports` field already provides browser support via the `"import"` condition
- The `browser` field provides backward compatibility for older tooling

---

## Summary Table

| Rule                       | Issue                                    | Impact                                           | Why Ignore                                                                           | Affected Packages |
| -------------------------- | ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------- |
| `false-cjs`                | Types interpreted as CJS for ESM imports | Theoretical type ambiguity in strict Node.js ESM | Bundlers handle correctly; fix is complex; industry standard                         | All packages      |
| `no-resolution`            | Subpaths fail on Node 10                 | None                                             | Node 10 is EOL (2021); never supported                                               | All packages      |
| `cjs-resolves-to-esm`      | `require()` fails for ESM files          | CJS consumers can't use sync require             | Browser-only wallet connection library; no server use case; dynamic import available | connect-solana    |
| `unexpected-module-syntax` | ESM syntax in CJS-typed files            | Node.js would reject if run directly             | Stencil limitation; bundlers work fine; browser-only                                 | multichain-ui     |

---

## Testing the Configuration

To verify the lint configuration passes:

```bash
# Run the full package config lint
yarn lint:package-config

# Run just publint on a specific package
yarn workspace @metamask/connect-solana publint

# Run just attw on a specific package
yarn workspace @metamask/connect-solana attw
```

Expected output:

- Exit code: 0 (success)
- publint: Warnings only (no errors)
- attw: "No problems found 🌟" (with ignored rules noted)

---

## When to Revisit These Decisions

Consider addressing these warnings if:

1. **`false-cjs`**: TypeScript makes `.d.mts` generation significantly easier, or a major consumer reports actual issues (not theoretical ones)

2. **`no-resolution`**: Never - Node 10 will never be supported

3. **`cjs-resolves-to-esm`**: A legitimate Node.js CJS use case emerges for connect-solana (unlikely given Solana's browser focus)

4. **`unexpected-module-syntax`**: Stencil changes its output format, or the package needs Node.js compatibility

---

## References

- [Are The Types Wrong documentation](https://github.com/arethetypeswrong/arethetypeswrong.github.io)
- [publint documentation](https://publint.dev/)
- [Node.js Package Entry Points](https://nodejs.org/api/packages.html#package-entry-points)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
