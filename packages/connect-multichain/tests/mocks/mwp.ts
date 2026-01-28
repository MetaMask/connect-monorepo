/* eslint-disable @typescript-eslint/naming-convention -- Test mocks use __prefixed naming */

/* eslint-disable @typescript-eslint/explicit-function-return-type -- Mock implementations */
/* eslint-disable @typescript-eslint/consistent-type-imports -- Dynamic import required for mock */
import * as vitest from 'vitest';

type PendingRequests = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

vitest.vi.mock(
  '../../src/multichain/transports/mwp',
  async (importOriginal) => {
    const { MWPTransport } =
      await importOriginal<
        typeof import('../../src/multichain/transports/mwp')
      >();

    // Create a mock Map to store pending requests
    const mockPendingRequestsMap = new Map<string, PendingRequests>();

    // Create a mock class that extends the original MWPTransport
    class MockMWPTransport extends MWPTransport {
      #mockPendingRequests = mockPendingRequestsMap;

      get pendingRequests() {
        return this.#mockPendingRequests;
      }

      set pendingRequests(pendingRequests: Map<string, PendingRequests>) {
        this.#mockPendingRequests = pendingRequests;
      }
    }

    return {
      MWPTransport: MockMWPTransport,
      __mockPendingRequestsMap: mockPendingRequestsMap,
    };
  },
);
