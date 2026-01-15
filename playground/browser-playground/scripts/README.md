# Browser Playground Scripts

## copy-wagmi-connector.js

### Purpose

This script automatically copies the wagmi MetaMask connector from `integrations/wagmi/metamask-connector.ts` to `src/wagmi/metamask-connector.ts` during the build process.

### Why Auto-Generation is Necessary

There are several reasons why we cannot directly import the connector from its original location:

1. **Create React App (CRA) Restrictions**: CRA enforces strict module resolution that prevents importing files outside of the `src/` directory. This is a security and build optimization feature that cannot be easily bypassed.

2. **NPM Package Isolation**: When playgrounds are published to NPM and deployed, they become isolated packages. Files outside the package boundary (like `integrations/wagmi/`) are not included in the published package, making direct imports impossible.

3. **Code Duplication Avoidance**: Rather than manually maintaining duplicate copies of the connector across multiple playgrounds, auto-generation ensures all playgrounds stay in sync with the original implementation.

4. **TypeScript Configuration Differences**: The original connector file may have TypeScript settings that differ from the playground's strict configuration. By copying the file and adding `@ts-nocheck`, we avoid build failures while still using the connector.

### How It Works

1. **Build-Time Execution**: The script runs automatically before both `build` and `start` commands via the package.json scripts.

2. **File Copying**: The script reads the original connector file from `integrations/wagmi/metamask-connector.ts` and copies it to `src/wagmi/metamask-connector.ts`.

3. **Header Injection**: A header comment is prepended to the copied file that:
   - Warns that the file is auto-generated
   - Indicates the source file location
   - Includes `@ts-nocheck` to skip TypeScript type checking

4. **Directory Creation**: The script ensures the destination directory (`src/wagmi/`) exists before copying.

### Usage

The script runs automatically during:
- `yarn build` - Before building the production bundle
- `yarn start` - Before starting the development server

You can also run it manually:
```bash
yarn copy-wagmi-connector
```

### Important Notes

- **Never edit `src/wagmi/metamask-connector.ts` manually** - All changes will be overwritten on the next build
- **Edit the original file** at `integrations/wagmi/metamask-connector.ts` instead
- The copied file includes `@ts-nocheck` to prevent TypeScript errors from interrupting builds
- This approach ensures consistency across all playgrounds that use the wagmi connector

### Related Files

- **Source**: `integrations/wagmi/metamask-connector.ts`
- **Destination**: `src/wagmi/metamask-connector.ts`
- **Consumer**: `src/wagmi/config.ts` imports from the copied file
- **Consumer**: `src/App.tsx` may import utilities from the copied file
