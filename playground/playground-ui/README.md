# @metamask/playground-ui

Shared UI logic and utilities for MetaMask playground applications.

This package provides common constants, helpers, types, and configuration utilities that are shared between the browser playground (`playground/browser-playground`) and React Native playground (`playground/react-native-playground`).

## Installation

```bash
yarn add @metamask/playground-ui
```

## Usage

### Constants

```typescript
import {
  WINDOW_POST_MESSAGE_ID,
  METAMASK_PROD_CHROME_ID,
  FEATURED_NETWORKS,
  getNetworkName,
  METHODS_REQUIRING_PARAM_INJECTION,
  injectParams,
  Eip155Methods,
} from '@metamask/playground-ui/constants';
```

### Helpers

```typescript
import {
  getCaip25FormattedAddresses,
  convertCaipChainIdsToHex,
  openRPCExampleToJSON,
  truncateJSON,
  normalizeMethodParams,
  updateInvokeMethodResults,
} from '@metamask/playground-ui/helpers';
```

### Types

```typescript
import type {
  PlaygroundConfig,
  PlatformAdapter,
  Base64Encoder,
} from '@metamask/playground-ui/types';
```

### Configuration

```typescript
import { setConfig, getConfig, setPlatformAdapter, getPlatformAdapter } from '@metamask/playground-ui/config';

// Set configuration at app startup
setConfig({
  heliusApiKey: process.env.HELIUS_API_KEY,
});

// Set platform-specific adapters
setPlatformAdapter({
  stringToBase64: (str) => btoa(str), // Browser
  // or
  stringToBase64: (str) => Buffer.from(str).toString('base64'), // React Native
});
```

## Architecture

This package follows a platform-agnostic design:

- **Constants**: 100% shareable across platforms
- **Helpers**: Pure functions with no platform-specific code
- **Types**: Shared interfaces and type definitions
- **Config**: Dependency injection for platform-specific implementations

Platform-specific code (UI components, styles, SDK providers) remain in the respective playground packages.

## License

MIT
