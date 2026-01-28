/* eslint-disable @typescript-eslint/explicit-function-return-type -- Mock factory function */
/* eslint-disable n/no-unsupported-features/node-builtins -- CloseEvent used for type annotation */
import * as vitest from 'vitest';

// Mock WebSocket at the top level
const createMockWebSocket = () => {
  const mockWS = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    readyState: 1,
    url: '',
    protocol: '',
    bufferedAmount: 0,
    extensions: '',
    binaryType: 'blob' as BinaryType,
    onopen: null as ((event: Event) => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    onclose: null as ((event: CloseEvent) => void) | null,
    send: vitest.vi.fn(),
    close: vitest.vi.fn(),
    addEventListener: vitest.vi.fn(),
    removeEventListener: vitest.vi.fn(),
    dispatchEvent: vitest.vi.fn(),
  };
  return mockWS;
};

vitest.vi.mock('ws', () => {
  return {
    default: vitest.vi.fn().mockImplementation(() => createMockWebSocket()),
    WebSocket: vitest.vi.fn().mockImplementation(() => createMockWebSocket()),
  };
});

// Mock native WebSocket for browser environments
const mockWebSocketConstructor = vitest.vi
  .fn()
  .mockImplementation(() => createMockWebSocket());
vitest.vi.stubGlobal('WebSocket', mockWebSocketConstructor);
