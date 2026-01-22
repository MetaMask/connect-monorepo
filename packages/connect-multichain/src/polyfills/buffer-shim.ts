/**
 * Buffer polyfill for browser and React Native environments.
 *
 * This shim sets up the global Buffer object before any code that depends on it runs.
 * It's imported at the top of platform-specific entry points (index.browser.ts, index.native.ts).
 *
 * Node.js environments already have Buffer globally available, so this is a no-op there.
 */
import { Buffer } from 'buffer';

// Get the appropriate global object for the current environment
const g =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
      ? global
      : typeof window !== 'undefined'
        ? window
        : ({} as typeof globalThis);

// Only set Buffer if it's not already defined (avoid overwriting Node.js native Buffer)
if (!g.Buffer) {
  g.Buffer = Buffer;
}
