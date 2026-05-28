# EIP-6963 Browser Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual EIP-6963 validation panel to the browser playground so reviewers can inspect SDK-managed provider announcements and trigger provider discovery events.

**Architecture:** Add shared `TEST_IDS.eip6963` selectors in `@metamask/playground-ui`, then add a browser-only `Eip6963TestBench` component that listens for `eip6963:announceProvider`, dispatches `eip6963:requestProvider`, and calls `legacySDK.announceProvider()`. Mount the panel from `App.tsx` near existing diagnostics and document the manual reviewer flow.

**Tech Stack:** React 19, CRA/Craco, TypeScript, Tailwind classes, Jest via `react-scripts test`, `@testing-library/react`, workspace package `@metamask/playground-ui`.

---

## File Structure

- Modify `playground/playground-ui/src/testIds/index.ts`
  - Adds stable selectors for the EIP-6963 panel and announcement rows.
- Create `playground/playground-ui/src/testIds/index.test.ts`
  - Verifies the new selector names so future e2e tests have stable targets.
- Modify `playground/browser-playground/package.json`
  - Adds a concrete `test:unit` script for browser playground React tests.
- Create `playground/browser-playground/src/components/Eip6963TestBench.tsx`
  - Browser-only manual validation panel for provider discovery events.
- Create `playground/browser-playground/src/components/Eip6963TestBench.test.tsx`
  - Unit tests for listening, row rendering, request dispatch, SDK announce, and clear behavior.
- Modify `playground/browser-playground/src/App.tsx`
  - Mounts the panel with `legacyProvider` and `legacySDK`.
- Modify `playground/browser-playground/src/App.test.tsx`
  - Replaces the stale smoke test with a mocked App render that covers the new panel without real providers.
- Modify `playground/browser-playground/README.md`
  - Adds manual validation instructions for reviewers.

## Task 1: Add Shared EIP-6963 Test IDs

**Files:**

- Modify: `playground/playground-ui/src/testIds/index.ts`
- Create: `playground/playground-ui/src/testIds/index.test.ts`

- [ ] **Step 1: Write the failing selector test**

Create `playground/playground-ui/src/testIds/index.test.ts`:

```ts
/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import { describe, expect, it } from 'vitest';

import { TEST_IDS } from './index';

describe('TEST_IDS.eip6963', () => {
  it('defines stable panel selectors', () => {
    expect(TEST_IDS.eip6963.section).toBe('eip6963-section');
    expect(TEST_IDS.eip6963.title).toBe('eip6963-title');
    expect(TEST_IDS.eip6963.btnRequestProviders).toBe(
      'eip6963-btn-request-providers',
    );
    expect(TEST_IDS.eip6963.btnAnnounceSdkProvider).toBe(
      'eip6963-btn-announce-sdk-provider',
    );
    expect(TEST_IDS.eip6963.btnClear).toBe('eip6963-btn-clear');
    expect(TEST_IDS.eip6963.emptyState).toBe('eip6963-empty-state');
  });

  it('defines stable announcement row selectors', () => {
    expect(TEST_IDS.eip6963.announcementRow(0)).toBe(
      'eip6963-announcement-row-0',
    );
    expect(TEST_IDS.eip6963.announcementName(1)).toBe(
      'eip6963-announcement-name-1',
    );
    expect(TEST_IDS.eip6963.announcementRdns(2)).toBe(
      'eip6963-announcement-rdns-2',
    );
    expect(TEST_IDS.eip6963.announcementUuid(3)).toBe(
      'eip6963-announcement-uuid-3',
    );
    expect(TEST_IDS.eip6963.announcementHasProviderRequest(4)).toBe(
      'eip6963-announcement-has-provider-request-4',
    );
    expect(TEST_IDS.eip6963.announcementIsLegacyProvider(5)).toBe(
      'eip6963-announcement-is-legacy-provider-5',
    );
  });
});
```

- [ ] **Step 2: Run the selector test to verify it fails**

Run:

```bash
yarn workspace @metamask/playground-ui test:unit src/testIds/index.test.ts
```

Expected: FAIL because `TEST_IDS.eip6963` does not exist.

- [ ] **Step 3: Add `TEST_IDS.eip6963`**

In `playground/playground-ui/src/testIds/index.ts`, add this section after the `wagmi` block and before the `solana` block:

```ts
  // ============================================
  // EIP-6963 TEST BENCH
  // ============================================
  eip6963: {
    section: 'eip6963-section',
    title: 'eip6963-title',
    btnRequestProviders: 'eip6963-btn-request-providers',
    btnAnnounceSdkProvider: 'eip6963-btn-announce-sdk-provider',
    btnClear: 'eip6963-btn-clear',
    emptyState: 'eip6963-empty-state',
    announcementRow: (index: number) =>
      createTestId('eip6963', 'announcement-row', String(index)),
    announcementName: (index: number) =>
      createTestId('eip6963', 'announcement-name', String(index)),
    announcementRdns: (index: number) =>
      createTestId('eip6963', 'announcement-rdns', String(index)),
    announcementUuid: (index: number) =>
      createTestId('eip6963', 'announcement-uuid', String(index)),
    announcementHasProviderRequest: (index: number) =>
      createTestId(
        'eip6963',
        'announcement-has-provider-request',
        String(index),
      ),
    announcementIsLegacyProvider: (index: number) =>
      createTestId(
        'eip6963',
        'announcement-is-legacy-provider',
        String(index),
      ),
  },
```

- [ ] **Step 4: Run the selector test to verify it passes**

Run:

```bash
yarn workspace @metamask/playground-ui test:unit src/testIds/index.test.ts
```

Expected: PASS for `TEST_IDS.eip6963`.

- [ ] **Step 5: Commit**

Run:

```bash
git add playground/playground-ui/src/testIds/index.ts playground/playground-ui/src/testIds/index.test.ts
git commit -m "test(playground-ui): add eip6963 test ids"
```

## Task 2: Add Browser Playground Unit Test Script

**Files:**

- Modify: `playground/browser-playground/package.json`

- [ ] **Step 1: Add the browser test script**

In `playground/browser-playground/package.json`, update the `scripts` object so the test entries read:

```json
    "test": "echo \"No test specified\"",
    "test:unit": "react-scripts test --watchAll=false",
    "test:verbose": "yarn test:unit --verbose"
```

- [ ] **Step 2: Run the browser unit test script to establish the current failure**

Run:

```bash
yarn workspace @metamask/browser-playground test:unit
```

Expected: FAIL because the existing `App.test.tsx` renders `App` without the required provider hook mocks. This failure is expected at this checkpoint and will be resolved in Task 4.

- [ ] **Step 3: Commit**

Run:

```bash
git add playground/browser-playground/package.json
git commit -m "test(browser-playground): add unit test script"
```

## Task 3: Build the EIP-6963 Test Bench Component

**Files:**

- Create: `playground/browser-playground/src/components/Eip6963TestBench.tsx`
- Create: `playground/browser-playground/src/components/Eip6963TestBench.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `playground/browser-playground/src/components/Eip6963TestBench.test.tsx`:

```tsx
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { TEST_IDS } from '@metamask/playground-ui';
import type {
  EIP1193Provider,
  MetamaskConnectEVM,
} from '@metamask/connect-evm';

import { Eip6963TestBench } from './Eip6963TestBench';

const createProvider = (): EIP1193Provider =>
  ({
    request: jest.fn(),
  }) as unknown as EIP1193Provider;

const createSdk = (): MetamaskConnectEVM =>
  ({
    announceProvider: jest.fn().mockResolvedValue(undefined),
  }) as unknown as MetamaskConnectEVM;

const dispatchAnnouncement = (detail: Record<string, unknown>): void => {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail,
      }),
    );
  });
};

describe('Eip6963TestBench', () => {
  it('renders an empty announcement state', () => {
    render(
      <Eip6963TestBench legacyProvider={undefined} legacySDK={undefined} />,
    );

    expect(screen.getByTestId(TEST_IDS.eip6963.section)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.eip6963.title)).toHaveTextContent(
      'EIP-6963 test bench',
    );
    expect(screen.getByTestId(TEST_IDS.eip6963.emptyState)).toHaveTextContent(
      'No announcements observed',
    );
    expect(
      screen.getByTestId(TEST_IDS.eip6963.btnAnnounceSdkProvider),
    ).toBeDisabled();
  });

  it('records an EIP-6963 announcement event', () => {
    const legacyProvider = createProvider();

    render(
      <Eip6963TestBench
        legacyProvider={legacyProvider}
        legacySDK={undefined}
      />,
    );

    dispatchAnnouncement({
      info: {
        name: 'MetaMask',
        rdns: 'io.metamask.mmc',
        uuid: '11111111-2222-4333-8444-555555555555',
      },
      provider: legacyProvider,
    });

    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementRow(0)),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementName(0)),
    ).toHaveTextContent('MetaMask');
    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementRdns(0)),
    ).toHaveTextContent('io.metamask.mmc');
    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementUuid(0)),
    ).toHaveTextContent('11111111-2222-4333-8444-555555555555');
    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementHasProviderRequest(0)),
    ).toHaveTextContent('Yes');
    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementIsLegacyProvider(0)),
    ).toHaveTextContent('Yes');
  });

  it('dispatches an EIP-6963 provider request event', () => {
    const requestListener = jest.fn();
    window.addEventListener('eip6963:requestProvider', requestListener);

    render(
      <Eip6963TestBench legacyProvider={undefined} legacySDK={undefined} />,
    );

    fireEvent.click(screen.getByTestId(TEST_IDS.eip6963.btnRequestProviders));

    expect(requestListener).toHaveBeenCalledTimes(1);
    window.removeEventListener('eip6963:requestProvider', requestListener);
  });

  it('calls announceProvider on the SDK instance', async () => {
    const legacySDK = createSdk();

    render(
      <Eip6963TestBench legacyProvider={undefined} legacySDK={legacySDK} />,
    );

    fireEvent.click(
      screen.getByTestId(TEST_IDS.eip6963.btnAnnounceSdkProvider),
    );

    await waitFor(() => {
      expect(legacySDK.announceProvider).toHaveBeenCalledTimes(1);
    });
  });

  it('clears observed announcements', () => {
    const legacyProvider = createProvider();

    render(
      <Eip6963TestBench
        legacyProvider={legacyProvider}
        legacySDK={undefined}
      />,
    );

    dispatchAnnouncement({
      info: {
        name: 'MetaMask',
        rdns: 'io.metamask.mmc',
        uuid: '11111111-2222-4333-8444-555555555555',
      },
      provider: legacyProvider,
    });

    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementRow(0)),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(TEST_IDS.eip6963.btnClear));

    expect(
      screen.queryByTestId(TEST_IDS.eip6963.announcementRow(0)),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.eip6963.emptyState)).toHaveTextContent(
      'No announcements observed',
    );
  });
});
```

- [ ] **Step 2: Run the component tests to verify they fail**

Run:

```bash
yarn workspace @metamask/browser-playground test:unit Eip6963TestBench.test.tsx
```

Expected: FAIL because `Eip6963TestBench` does not exist.

- [ ] **Step 3: Implement the component**

Create `playground/browser-playground/src/components/Eip6963TestBench.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  EIP1193Provider,
  MetamaskConnectEVM,
} from '@metamask/connect-evm';
import { TEST_IDS } from '@metamask/playground-ui';

const EIP6963_ANNOUNCE_PROVIDER_EVENT = 'eip6963:announceProvider';
const EIP6963_REQUEST_PROVIDER_EVENT = 'eip6963:requestProvider';
const MAX_ANNOUNCEMENTS = 25;

type Eip6963ProviderInfo = {
  name?: unknown;
  rdns?: unknown;
  uuid?: unknown;
};

type Eip6963ProviderDetail = {
  info?: Eip6963ProviderInfo;
  provider?: unknown;
};

type Eip6963Announcement = {
  id: number;
  observedAt: string;
  name: string;
  rdns: string;
  uuid: string;
  hasProviderRequest: boolean;
  isLegacyProvider: boolean;
};

type Eip6963TestBenchProps = {
  legacyProvider: EIP1193Provider | undefined;
  legacySDK: MetamaskConnectEVM | undefined;
};

const formatField = (value: unknown): string =>
  typeof value === 'string' && value.length > 0 ? value : 'Not available';

const hasProviderRequest = (provider: unknown): boolean =>
  typeof (provider as Partial<EIP1193Provider> | undefined)?.request ===
  'function';

export function Eip6963TestBench({
  legacyProvider,
  legacySDK,
}: Eip6963TestBenchProps) {
  const [announcements, setAnnouncements] = useState<Eip6963Announcement[]>([]);
  const nextId = useRef(0);
  const legacyProviderRef = useRef<EIP1193Provider | undefined>(legacyProvider);

  useEffect(() => {
    legacyProviderRef.current = legacyProvider;
  }, [legacyProvider]);

  useEffect(() => {
    const handleAnnouncement = (event: Event): void => {
      const { detail } = event as CustomEvent<Eip6963ProviderDetail>;
      const info = detail?.info ?? {};
      const provider = detail?.provider;

      const announcement: Eip6963Announcement = {
        id: nextId.current,
        observedAt: new Date().toLocaleTimeString(),
        name: formatField(info.name),
        rdns: formatField(info.rdns),
        uuid: formatField(info.uuid),
        hasProviderRequest: hasProviderRequest(provider),
        isLegacyProvider:
          provider !== undefined && provider === legacyProviderRef.current,
      };
      nextId.current += 1;

      setAnnouncements((currentAnnouncements) =>
        [announcement, ...currentAnnouncements].slice(0, MAX_ANNOUNCEMENTS),
      );
    };

    window.addEventListener(
      EIP6963_ANNOUNCE_PROVIDER_EVENT,
      handleAnnouncement,
    );

    return () => {
      window.removeEventListener(
        EIP6963_ANNOUNCE_PROVIDER_EVENT,
        handleAnnouncement,
      );
    };
  }, []);

  const requestProviders = useCallback(() => {
    window.dispatchEvent(new Event(EIP6963_REQUEST_PROVIDER_EVENT));
  }, []);

  const announceSdkProvider = useCallback(async () => {
    if (!legacySDK) {
      return;
    }

    try {
      await legacySDK.announceProvider();
    } catch (error) {
      console.error('Failed to announce EIP-6963 SDK provider', error);
    }
  }, [legacySDK]);

  return (
    <section
      data-testid={TEST_IDS.eip6963.section}
      className="bg-white rounded-lg p-8 mb-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
        <h2
          data-testid={TEST_IDS.eip6963.title}
          className="text-2xl font-bold text-gray-800"
        >
          EIP-6963 test bench
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            data-testid={TEST_IDS.eip6963.btnRequestProviders}
            onClick={requestProviders}
            className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Request providers
          </button>
          <button
            type="button"
            data-testid={TEST_IDS.eip6963.btnAnnounceSdkProvider}
            onClick={announceSdkProvider}
            disabled={!legacySDK}
            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Announce SDK provider
          </button>
          <button
            type="button"
            data-testid={TEST_IDS.eip6963.btnClear}
            onClick={() => setAnnouncements([])}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {announcements.length === 0 ? (
        <p
          data-testid={TEST_IDS.eip6963.emptyState}
          className="text-sm text-gray-500"
        >
          No announcements observed
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b border-gray-200">
                <th className="py-2 pr-4 font-medium">Observed</th>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">RDNS</th>
                <th className="py-2 pr-4 font-medium">UUID</th>
                <th className="py-2 pr-4 font-medium">Provider request</th>
                <th className="py-2 pr-4 font-medium">Legacy provider</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((announcement, index) => (
                <tr
                  key={announcement.id}
                  data-testid={TEST_IDS.eip6963.announcementRow(index)}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-2 pr-4 text-gray-500">
                    {announcement.observedAt}
                  </td>
                  <td
                    data-testid={TEST_IDS.eip6963.announcementName(index)}
                    className="py-2 pr-4 text-gray-800"
                  >
                    {announcement.name}
                  </td>
                  <td
                    data-testid={TEST_IDS.eip6963.announcementRdns(index)}
                    className="py-2 pr-4 font-mono text-gray-700"
                  >
                    {announcement.rdns}
                  </td>
                  <td
                    data-testid={TEST_IDS.eip6963.announcementUuid(index)}
                    className="py-2 pr-4 font-mono text-gray-700"
                  >
                    {announcement.uuid}
                  </td>
                  <td
                    data-testid={TEST_IDS.eip6963.announcementHasProviderRequest(
                      index,
                    )}
                    className="py-2 pr-4 text-gray-700"
                  >
                    {announcement.hasProviderRequest ? 'Yes' : 'No'}
                  </td>
                  <td
                    data-testid={TEST_IDS.eip6963.announcementIsLegacyProvider(
                      index,
                    )}
                    className="py-2 pr-4 text-gray-700"
                  >
                    {announcement.isLegacyProvider ? 'Yes' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run the component tests to verify they pass**

Run:

```bash
yarn workspace @metamask/browser-playground test:unit Eip6963TestBench.test.tsx
```

Expected: PASS for all `Eip6963TestBench` tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add playground/browser-playground/src/components/Eip6963TestBench.tsx playground/browser-playground/src/components/Eip6963TestBench.test.tsx
git commit -m "feat(browser-playground): add eip6963 test bench"
```

## Task 4: Mount the Test Bench in the Playground

**Files:**

- Modify: `playground/browser-playground/src/App.tsx`
- Modify: `playground/browser-playground/src/App.test.tsx`

- [ ] **Step 1: Update the App smoke test with hook mocks**

Replace `playground/browser-playground/src/App.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import { TEST_IDS } from '@metamask/playground-ui';

import App from './App';

jest.mock('./sdk', () => ({
  useSDK: () => ({
    error: null,
    status: 'loaded',
    session: undefined,
    connect: jest.fn(),
    disconnect: jest.fn(),
    invokeMethod: jest.fn(),
  }),
}));

jest.mock('./sdk/LegacyEVMSDKProvider', () => ({
  useLegacyEVMSDK: () => ({
    connected: false,
    provider: undefined,
    chainId: undefined,
    accounts: [],
    sdk: undefined,
    error: null,
    connect: jest.fn(),
    connectAndSign: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

jest.mock('./sdk/SolanaProvider', () => ({
  useSolanaSDK: () => ({
    walletError: null,
    clearWalletError: jest.fn(),
  }),
}));

jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: false,
    connecting: false,
    disconnecting: false,
    publicKey: null,
    wallets: [],
    select: jest.fn(),
  }),
}));

jest.mock('wagmi', () => ({
  useBalance: () => ({ data: undefined }),
  useBlockNumber: () => ({ data: undefined }),
  useChainId: () => 1,
  useChains: () => [],
  useConnect: () => ({
    connectors: [],
    connectAsync: jest.fn(),
    status: 'idle',
  }),
  useConnection: () => ({
    address: undefined,
    isConnected: false,
  }),
  useConnectorClient: () => ({ data: undefined }),
  useDisconnect: () => ({ disconnect: jest.fn() }),
  useSendTransaction: () => ({
    data: undefined,
    error: null,
    isPending: false,
    sendTransaction: jest.fn(),
  }),
  useSignMessage: () => ({
    data: undefined,
    signMessage: jest.fn(),
  }),
  useSwitchChain: () => ({ switchChain: jest.fn() }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
  }),
}));

test('renders the playground title and EIP-6963 test bench', () => {
  render(<App />);

  expect(screen.getByText(/MetaMask MultiChain/iu)).toBeInTheDocument();
  expect(screen.getByTestId(TEST_IDS.eip6963.section)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the App test to verify it fails before the App wiring**

Run:

```bash
yarn workspace @metamask/browser-playground test:unit App.test.tsx
```

Expected: FAIL because `App.tsx` does not mount `Eip6963TestBench` yet.

- [ ] **Step 3: Import the test bench in App**

In `playground/browser-playground/src/App.tsx`, add this import near the other component imports:

```ts
import { Eip6963TestBench } from './components/Eip6963TestBench';
```

- [ ] **Step 4: Mount the test bench before `AnalyticsTestBench`**

In `playground/browser-playground/src/App.tsx`, insert this JSX immediately before the existing `<AnalyticsTestBench ... />` block:

```tsx
<Eip6963TestBench legacyProvider={legacyProvider} legacySDK={legacySDK} />
```

- [ ] **Step 5: Run App and component tests**

Run:

```bash
yarn workspace @metamask/browser-playground test:unit App.test.tsx Eip6963TestBench.test.tsx
```

Expected: PASS for `App.test.tsx` and `Eip6963TestBench.test.tsx`.

- [ ] **Step 6: Commit**

Run:

```bash
git add playground/browser-playground/src/App.tsx playground/browser-playground/src/App.test.tsx
git commit -m "feat(browser-playground): render eip6963 validation panel"
```

## Task 5: Document Manual Browser Validation

**Files:**

- Modify: `playground/browser-playground/README.md`

- [ ] **Step 1: Add the README section**

In `playground/browser-playground/README.md`, add this section after the `### Wagmi Connector` feature section and before `## Manually testing analytics events`:

````md
## Manually validating EIP-6963 announcements

The browser playground includes an **EIP-6963 test bench** for checking provider discovery behavior from `@metamask/connect-evm`.

1. Start the browser playground:

   ```bash
   yarn workspace @metamask/browser-playground start
   ```

2. Open `http://localhost:3000`.
3. Find the **EIP-6963 test bench** section.
4. Reload the page and watch for an automatic announcement row.
5. Click **Request providers** to dispatch `eip6963:requestProvider`.
6. Confirm the MetaMask row includes an `rdns`, UUID, `Provider request` = `Yes`, and `Legacy provider` = `Yes`.
7. Click **Announce SDK provider** to call `legacySDK.announceProvider()` manually if another announcement is needed.
8. Click **Clear** to reset the observed announcement log.

This panel observes real browser `eip6963:announceProvider` events. It does not simulate native wallet announcements.
````

- [ ] **Step 2: Run README formatting check**

Run:

```bash
yarn lint:misc --check playground/browser-playground/README.md
```

Expected: PASS for README formatting.

- [ ] **Step 3: Commit**

Run:

```bash
git add playground/browser-playground/README.md
git commit -m "docs(browser-playground): add eip6963 validation steps"
```

## Task 6: Final Verification

**Files:**

- Verify all modified files from Tasks 1-5.

- [ ] **Step 1: Run playground-ui unit tests**

Run:

```bash
yarn workspace @metamask/playground-ui test:unit src/testIds/index.test.ts
```

Expected: PASS.

- [ ] **Step 2: Build shared playground UI**

Run:

```bash
yarn workspace @metamask/playground-ui build
```

Expected: PASS and regenerate `playground/playground-ui/dist`.

- [ ] **Step 3: Run browser playground unit tests**

Run:

```bash
yarn workspace @metamask/browser-playground test:unit
```

Expected: PASS for `App.test.tsx` and `Eip6963TestBench.test.tsx`.

- [ ] **Step 4: Build browser playground**

Run:

```bash
yarn workspace @metamask/browser-playground build
```

Expected: PASS.

- [ ] **Step 5: Inspect git status**

Run:

```bash
git status --short
```

Expected: only intentional source, test, README, package, and generated dist changes are present. If `playground/playground-ui/dist` changes are generated by the build and this repo does not track them, leave them untracked. If they are tracked, include them in the final change.

- [ ] **Step 6: Manual validation**

Run:

```bash
yarn workspace @metamask/browser-playground start
```

Expected: CRA starts at `http://localhost:3000` or the next available port. In the browser, verify:

- the `EIP-6963 test bench` section is visible before wallet connection
- reloading the page records an automatic announcement when the SDK announces
- `Request providers` dispatches a request and records re-announcements
- `Announce SDK provider` records an SDK announcement when `legacySDK` is initialized
- a MetaMask row shows `Provider request` = `Yes`
- a row from the current SDK provider shows `Legacy provider` = `Yes`

Stop the dev server before final handoff.

## Self-Review

Spec coverage:

- Manual validation panel: Task 3 and Task 4.
- Browser event listening: Task 3.
- `Request providers`: Task 3.
- `Announce SDK provider`: Task 3.
- Visible before account connection: Task 4.
- Shared test IDs: Task 1.
- Component tests: Task 3.
- Browser playground test command: Task 2.
- README manual steps: Task 5.
- RDNS decision preserved: no task changes `packages/connect-evm/src/eip6963.ts`.

Red flag scan:

- No unresolved plan tokens are present.

Type consistency:

- `Eip6963TestBenchProps`, `legacyProvider`, `legacySDK`, `hasProviderRequest`, and `isLegacyProvider` names are consistent across the component and tests.
