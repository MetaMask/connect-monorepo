# EIP-6963 Browser Playground Validation Panel Design

## Goal

Add a manual validation panel to the browser playground so reviewers can inspect and trigger EIP-6963 provider discovery events for the SDK-managed EVM provider.

## Context

PR #304 adds automatic EIP-6963 announcement for the EVM client. The browser playground already creates a legacy EVM client on page load in `playground/browser-playground/src/sdk/LegacyEVMSDKProvider.tsx`, before the user clicks `Connect (Legacy EVM)`. That makes the playground a good place to validate whether the SDK-managed provider announces itself, re-announces on `eip6963:requestProvider`, and exposes an EIP-1193 provider in the event detail.

The playground already has a manual diagnostic pattern in `AnalyticsTestBench`, and shared test IDs in `@metamask/playground-ui` support stable selectors for future e2e coverage.

## User Flow

The browser playground should show an `EIP-6963 test bench` section while disconnected and connected.

A reviewer can:

1. Load or reload the playground and watch for the automatic `eip6963:announceProvider` event.
2. Click `Request providers` to dispatch `eip6963:requestProvider`.
3. Click `Announce SDK provider` to call `legacySDK.announceProvider()`.
4. Inspect recent announcement rows.
5. Click `Clear` to reset the local event log.

Each announcement row should show:

- observed time
- provider name
- `rdns`
- `uuid`
- whether `detail.provider.request` exists
- whether the announced provider object is the same object as the current legacy EVM provider instance

## Recommended Approach

Create a dedicated browser component:

`playground/browser-playground/src/components/Eip6963TestBench.tsx`

The component owns a local announcement log and registers a browser event listener on mount:

```ts
window.addEventListener('eip6963:announceProvider', handler);
```

The event handler reads `event.detail.info` and stores a compact record:

```ts
type Eip6963Announcement = {
  id: number;
  observedAt: string;
  name: string;
  rdns: string;
  uuid: string;
  hasProviderRequest: boolean;
  isLegacyProvider: boolean;
};
```

`isLegacyProvider` is computed by comparing `event.detail.provider === legacyProvider`, where `legacyProvider` is passed from `App.tsx`. This gives reviewers a direct signal that the row came from the SDK-managed provider currently created by the playground.

The component receives:

```ts
type Eip6963TestBenchProps = {
  legacyProvider: EIP1193Provider | undefined;
  legacySDK: MetamaskConnectEVM | undefined;
};
```

The `Request providers` button dispatches:

```ts
window.dispatchEvent(new Event('eip6963:requestProvider'));
```

The `Announce SDK provider` button calls:

```ts
await legacySDK.announceProvider();
```

The announce button is disabled until `legacySDK` exists. The component itself should still render before account connection because EIP-6963 discovery is independent of connecting accounts.

## UI Placement

Mount the test bench in `playground/browser-playground/src/App.tsx` near `AnalyticsTestBench`, before the connected-session cards. This keeps diagnostics together and ensures the panel is visible before any wallet connection.

The UI should match the existing playground style:

- white section
- compact heading
- three small buttons
- empty state when no announcements have been observed
- compact table or list for recent announcements

The panel should avoid long instructional copy. Labels and field names are enough because this is a reviewer-facing diagnostic tool.

## Test IDs

Add `TEST_IDS.eip6963` entries in `playground/playground-ui/src/testIds/index.ts` for stable manual and future automated selection:

- `section`
- `title`
- `btnRequestProviders`
- `btnAnnounceSdkProvider`
- `btnClear`
- `emptyState`
- `announcementRow(index)`
- `announcementName(index)`
- `announcementRdns(index)`
- `announcementUuid(index)`
- `announcementHasProviderRequest(index)`
- `announcementIsLegacyProvider(index)`

These IDs should be used by `Eip6963TestBench`.

## Tests

Keep tests focused on component behavior.

Add or update browser playground React tests to cover:

1. The test bench renders.
2. Dispatching a synthetic `eip6963:announceProvider` event adds a row.
3. The row shows name, `rdns`, `uuid`, provider request availability, and legacy-provider match.
4. Clicking `Clear` removes observed rows.

The tests should not require a real MetaMask extension or a real SDK connection.

## Documentation

Update `playground/browser-playground/README.md` with a short manual validation section:

1. Start the browser playground.
2. Open the page.
3. Inspect `EIP-6963 test bench`.
4. Confirm an automatic announcement appears after page load.
5. Click `Request providers`.
6. Confirm a MetaMask announcement row appears with the expected `rdns`, UUID, `detail.provider.request`, and legacy-provider match.
7. Click `Announce SDK provider` to force a manual announcement if needed.

## Out of Scope

Do not add native-provider simulation in this change. Synthetic native announcements may be useful later for suppression testing, but the immediate reviewer need is to validate real browser playground behavior.

Do not add end-to-end automation in this change. The shared test IDs should make that straightforward later.

Do not change the RDNS decision in this playground panel work. The implementation must preserve the current PR behavior and leave the unresolved `io.metamask.mmc` versus native MetaMask RDNS decision to a separate change.

## Verification

Run a browser playground test command that covers the new component, then run a browser playground build:

```bash
yarn workspace @metamask/browser-playground test:unit
yarn workspace @metamask/browser-playground build
```

Because the current package `test` script is a placeholder, the implementation should add a concrete `test:unit` script for browser playground React tests.
