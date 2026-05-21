# Connect EVM EIP-6963 Auto-Announce Design

Date: 2026-05-21

## Context

`@metamask/connect-solana` already participates in Solana wallet discovery by auto-registering a Wallet Standard wallet unless an injected MetaMask wallet is already present. `@metamask/connect-evm` should mirror that behavior for EIP-6963 after the SDK has loaded, so wallet pickers that consume raw EIP-6963 events do not show two indistinguishable MetaMask entries when the native MetaMask extension is also installed.

This design is separate from wagmi PR #5109. That PR avoids loading the SDK chunk on connector probe paths. This work applies only after `@metamask/connect-evm` has loaded and created an EIP-1193 provider.

## Decisions

- The SDK-managed EIP-6963 provider is announced as `name: "MetaMask"` and `rdns: "io.metamask.mmc"`.
- The SDK suppresses its own announcement only when it observes a native MetaMask EIP-6963 provider with exact `rdns` of `io.metamask` or `io.metamask.mobile`.
- `io.metamask.flask` does not suppress the SDK announcement in this implementation.
- The icon is a self-contained `data:image/svg+xml` URI derived from the existing local MetaMask fox SVG at `packages/multichain-ui/src/assets/fox.svg`. `@metamask/connect-evm` owns the exported data URI constant so its browser bundle does not depend on `@metamask/multichain-ui`.
- Auto-announcement happens during `createEVMClient()` after the EVM client and provider have been created, unless the consumer passes `skipAutoAnnounce: true`.
- Consumers also get an explicit `announceProvider()` method on the returned `MetamaskConnectEVM` instance for manual announcement control, matching the shape of Solana's `skipAutoRegister` plus `registerWallet()` pattern.

## Architecture

Add a focused browser-only helper under `packages/connect-evm/src` for EIP-6963 discovery and announcement. The helper owns:

- minimal local EIP-6963 types for provider info, provider detail, and event names;
- native MetaMask detection using `eip6963:announceProvider`;
- SDK provider announcement using `eip6963:announceProvider`;
- re-announcement on future `eip6963:requestProvider` events;
- idempotency so repeated manual or automatic calls do not install duplicate listeners.

The helper does not set or mutate `window.ethereum`. It only announces the existing `EIP1193Provider` returned by `client.getProvider()`.

## Flow

When `createEVMClient()` finishes creating `MetamaskConnectEVM`, it starts auto-announcement unless `skipAutoAnnounce` is true.

The announcement flow is:

1. If there is no browser `window`, return without announcing.
2. Install a temporary `eip6963:announceProvider` listener.
3. Dispatch `eip6963:requestProvider` so already-loaded wallets can re-announce.
4. Wait 300 ms, matching the existing EIP-6963 detection window in `connect-multichain`.
5. Remove the temporary listener.
6. If an observed provider has exact `rdns` `io.metamask` or `io.metamask.mobile`, suppress the SDK announcement.
7. Otherwise, create immutable provider detail with the SDK provider and metadata, dispatch `eip6963:announceProvider`, and keep a request listener installed to re-dispatch the same detail on later `eip6963:requestProvider` events.

The provider metadata uses a page-lifetime UUID generated with `crypto.randomUUID()` when available, with a local UUIDv4 fallback for test and legacy browser environments. The UUID remains stable for the SDK client instance.

## Public API

Extend `createEVMClient(options)` with:

```typescript
skipAutoAnnounce?: boolean;
```

Extend `MetamaskConnectEVM` with:

```typescript
announceProvider(): Promise<void>;
```

`skipAutoAnnounce: true` prevents only the automatic EIP-6963 announcement. It does not change provider behavior, connection behavior, or direct use of `getProvider()`.

`announceProvider()` runs the same detection and suppression flow as auto-announcement. If the SDK has already announced, it resolves without adding duplicate listeners.

## Error Handling

EIP-6963 announcement is best-effort and should not break client creation. If browser event dispatch or UUID generation fails unexpectedly, the helper logs through the existing `connect-evm` logger and resolves without throwing from the background auto-announcement path.

Manual `announceProvider()` should also resolve without throwing for non-browser environments. In browser environments, unexpected internal errors are logged and swallowed because announcement is discovery metadata, not wallet connectivity.

## Testing

Add focused Vitest coverage in `packages/connect-evm`:

- extension present: dispatch a native `eip6963:announceProvider` with `rdns: "io.metamask"` in response to `eip6963:requestProvider`; verify the SDK does not dispatch its own provider detail;
- mobile extension present: same suppression behavior for `rdns: "io.metamask.mobile"`;
- extension absent: verify the SDK dispatches one `eip6963:announceProvider` with `info.name: "MetaMask"`, `info.rdns: "io.metamask.mmc"`, data URI icon, UUID, and the client EIP-1193 provider;
- Flask present: verify `rdns: "io.metamask.flask"` does not suppress the SDK announcement;
- opt out: `skipAutoAnnounce: true` does not announce automatically;
- manual announce: a skipped client can call `announceProvider()` and announce when no native MetaMask provider is observed;
- idempotency: repeated `announceProvider()` calls and later `eip6963:requestProvider` events do not install duplicate request listeners or create multiple SDK identities.

Existing EVM provider and connection tests remain unchanged. A package-level test command is sufficient for this change:

```shell
yarn workspace @metamask/connect-evm test
```

## End-to-End Verification

Manual verification should cover two browser cases:

- with MetaMask extension installed, a raw EIP-6963 listener and wagmi-based picker show only the extension MetaMask entry;
- without MetaMask extension installed, a raw EIP-6963 listener discovers the SDK-managed `MetaMask` provider with `rdns: "io.metamask.mmc"`.

For wagmi consumers, this behavior complements PR #5109: reconnect probes still avoid SDK loading, and post-load picker discovery avoids duplicate MetaMask rows for raw EIP-6963 consumers.

## Source Reference

EIP-6963 defines provider metadata fields `uuid`, `name`, `icon`, and `rdns`, requires the announced detail to contain `info` and an EIP-1193 `provider`, and uses `eip6963:announceProvider` plus `eip6963:requestProvider` window events for discovery and re-announcement: https://eips.ethereum.org/EIPS/eip-6963
