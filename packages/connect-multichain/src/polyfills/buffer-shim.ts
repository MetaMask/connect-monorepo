/* eslint-disable no-restricted-globals -- Polyfill intentionally uses global/window */
/* eslint-disable no-negated-condition -- Ternary chain is clearer here */
/* eslint-disable no-nested-ternary -- Environment detection requires chained ternary */
/* eslint-disable import-x/no-nodejs-modules -- Buffer polyfill requires Node.js module */
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
const globalObj =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
      ? global
      : typeof window !== 'undefined'
        ? window
        : ({} as typeof globalThis);

// Only set Buffer if it's not already defined (avoid overwriting Node.js native Buffer)
if (!globalObj.Buffer) {
  globalObj.Buffer = Buffer;
}
