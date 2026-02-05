# React Native Playground Scripts

## copy-wagmi-connector.js

### Purpose

This script automatically copies the wagmi MetaMask connector from `integrations/wagmi/metamask-connector.ts` to `src/wagmi/metamask-connector.ts` during the build process.

### Why Auto-Generation is Necessary

There are several reasons why we cannot directly import the connector from its original location:

1. **React Native/Expo Restrictions**: React Native and Expo enforce strict module resolution that prevents importing files outside of the `src/` directory. This is a security and build optimization feature that cannot be easily bypassed.

2. **NPM Package Isolation**: When playgrounds are published to NPM and deployed, they become isolated packages. Files outside the package boundary (like `integrations/wagmi/`) are not included in the published package, making direct imports impossible.

3. **Code Duplication Avoidance**: Rather than manually maintaining duplicate copies of the connector across multiple playgrounds, auto-generation ensures all playgrounds stay in sync with the original implementation.

4. **TypeScript Configuration Differences**: The original connector file may have TypeScript settings that differ from the playground's strict configuration. By copying the file and adding `@ts-nocheck`, we avoid build failures while still using the connector.

### How It Works

1. **Build-Time Execution**: The script runs automatically before `start`, `ios`, `android`, `web`, and `build` commands via the package.json scripts.

2. **File Copying**: The script reads the original connector file from `integrations/wagmi/metamask-connector.ts` and copies it to `src/wagmi/metamask-connector.ts`.

3. **Header Injection**: A header comment is prepended to the copied file that:
   - Warns that the file is auto-generated
   - Indicates the source file location
   - Includes `@ts-nocheck` to skip TypeScript type checking

4. **Directory Creation**: The script ensures the destination directory (`src/wagmi/`) exists before copying.

### Usage

The script runs automatically during:

- `yarn start` - Before starting the development server
- `yarn ios` - Before starting iOS development
- `yarn android` - Before starting Android development
- `yarn web` - Before starting web development
- `yarn build` - Before building the production bundle

You can also run it manually:

```bash
yarn copy-wagmi-connector
```

### Important Notes

- **Never edit `src/wagmi/metamask-connector.ts` manually** - All changes will be overwritten on the next build
- **Edit the original file** at `integrations/wagmi/metamask-connector.ts` instead
- The copied file includes `@ts-nocheck` to prevent TypeScript errors from interrupting builds
- This approach ensures consistency across all playgrounds that use the wagmi connector

### Window Polyfill

Since React Native doesn't have a `window` object, a polyfill has been added in `polyfills.ts` to provide the following properties and methods that the wagmi connector and connect-multichain libraries expect:

**Window Object Properties:**

- `window.location.hostname` - Default value: `'react-native-playground'`
- `window.location.href` - Default value: `'react-native-playground://'`

**Note:** Deeplinks in React Native are handled via the `mobile.preferredOpenLink` option passed to the wagmi connector, not through `window.location.href`. This is configured in `src/wagmi/config.ts` using React Native's `Linking.openURL()`.

**Window Object Methods:**

- `window.addEventListener()` - No-op function (browser events don't exist in React Native)
- `window.removeEventListener()` - No-op function for cleanup
- `window.dispatchEvent()` - No-op function (returns `true`)

**Event Classes:**

- `Event` - Polyfill for the Event class with basic properties and methods
- `CustomEvent` - Polyfill for CustomEvent that extends Event, used by wagmi and other libraries

The polyfill ensures that code checking for `typeof window.addEventListener !== 'undefined'` will pass, and prevents runtime errors when these methods are called. Since React Native doesn't have browser events, these methods are safe no-ops that won't interfere with the app's functionality. The Event and CustomEvent classes are provided to satisfy type checks and constructor calls, but they won't actually propagate events in React Native.

### Related Files

- **Source**: `integrations/wagmi/metamask-connector.ts`
- **Destination**: `src/wagmi/metamask-connector.ts`
- **Consumer**: `src/wagmi/config.ts` imports from the copied file
- **Polyfill**: `polyfills.ts` provides window object for React Native
- **Consumer**: `app/index.tsx` uses wagmi hooks and components
