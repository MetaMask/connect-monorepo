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

import { getGlobalObject } from '../multichain/utils';

// Only set Buffer if it's not already defined (avoid overwriting Node.js native Buffer)
const globalObj = getGlobalObject();
if (!globalObj.Buffer) {
  globalObj.Buffer = Buffer;
}
