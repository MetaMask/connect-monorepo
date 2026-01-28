/* eslint-disable no-restricted-globals -- Polyfill intentionally uses global/window */
/* eslint-disable import-x/no-nodejs-modules -- Buffer polyfill */
/* eslint-disable no-negated-condition -- Clearer pattern for undefined checks */
/* eslint-disable no-empty-function -- Stub implementations */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Polyfill stubs */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Polyfill assignments */

import { Buffer } from 'buffer';

// NOTE: Buffer polyfill is now handled by @metamask/connect-multichain
// We still need to set it here for other libraries that may need it before connect-multichain loads
global.Buffer = Buffer;

// Polyfill for window object (used by wagmi connector and connect-multichain)
// React Native doesn't have a window object, so we create a simple polyfill
// for the properties and methods that the libraries need
// Create a simple event listener storage for tracking listeners
const eventListeners = new Map<string, Set<EventListener>>();

// Get or create window object
let windowObj: any;
if (typeof global !== 'undefined' && global.window) {
  windowObj = global.window;
} else if (typeof window !== 'undefined') {
  windowObj = window;
} else {
  windowObj = {};
}

// Ensure location object exists
if (!windowObj.location) {
  windowObj.location = {
    hostname: 'react-native-playground',
    href: 'react-native-playground://',
  };
}

// Ensure addEventListener exists (even if window already exists, it might not have this method)
if (typeof windowObj.addEventListener !== 'function') {
  windowObj.addEventListener = (event: string, listener: EventListener) => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set());
    }
    eventListeners.get(event)?.add(listener);
  };
}

// Ensure removeEventListener exists
if (typeof windowObj.removeEventListener !== 'function') {
  windowObj.removeEventListener = (event: string, listener: EventListener) => {
    eventListeners.get(event)?.delete(listener);
  };
}

// Ensure dispatchEvent exists
if (typeof windowObj.dispatchEvent !== 'function') {
  windowObj.dispatchEvent = (_event: Event) => {
    // In React Native, we don't have browser events, so this is a no-op
    return true;
  };
}

// Set window on global to ensure it's available everywhere
if (typeof global !== 'undefined') {
  global.window = windowObj;
}

// Polyfill Event class (needed for CustomEvent)
if (typeof global.Event === 'undefined' && typeof Event === 'undefined') {
  class EventPolyfill {
    type: string;

    bubbles: boolean;

    cancelable: boolean;

    defaultPrevented: boolean;

    eventPhase: number;

    timeStamp: number;

    target: EventTarget | null;

    currentTarget: EventTarget | null;

    constructor(type: string, options?: EventInit) {
      this.type = type;
      this.bubbles = options?.bubbles ?? false;
      this.cancelable = options?.cancelable ?? false;
      this.defaultPrevented = false;
      this.eventPhase = 0;
      this.timeStamp = Date.now();
      this.target = null;
      this.currentTarget = null;
    }

    preventDefault() {
      this.defaultPrevented = true;
    }

    stopPropagation() {
      // No-op in React Native
    }

    stopImmediatePropagation() {
      // No-op in React Native
    }
  }

  // Set Event on both global and window
  if (typeof global !== 'undefined') {
    global.Event = EventPolyfill as any;
  }
  if (windowObj) {
    windowObj.Event = EventPolyfill as any;
  }
}

// Polyfill CustomEvent (used by wagmi and other libraries)
// React Native doesn't have CustomEvent, so we create a simple polyfill
if (
  typeof global.CustomEvent === 'undefined' &&
  typeof CustomEvent === 'undefined'
) {
  // Get Event class (either the polyfill we just created or the native one)
  const EventClass =
    (typeof global !== 'undefined' && global.Event) ||
    (typeof Event !== 'undefined'
      ? Event
      : class {
          type: string;

          constructor(type: string) {
            this.type = type;
          }

          preventDefault() {}

          stopPropagation() {}

          stopImmediatePropagation() {}
        });

  class CustomEventPolyfill extends EventClass {
    detail: any;

    constructor(type: string, options?: CustomEventInit) {
      super(type, options);
      this.detail = options?.detail ?? null;
    }
  }

  // Set CustomEvent on both global and window
  if (typeof global !== 'undefined') {
    global.CustomEvent = CustomEventPolyfill as any;
  }
  if (windowObj) {
    windowObj.CustomEvent = CustomEventPolyfill as any;
  }
}
