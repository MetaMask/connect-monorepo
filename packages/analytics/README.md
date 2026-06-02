# `@metamask/analytics`

> Internal telemetry for the MetaMask Connect SDK.

This package collects anonymous, aggregate telemetry about the connection lifecycle
(initialization, connection attempts, RPC actions) so the MetaMask team can monitor SDK
health and reliability. It is a **dependency of the connect packages**, not a
general-purpose analytics library — dapps do not normally install or import it directly.
It is consumed internally by [`@metamask/connect-multichain`](../connect-multichain) and
the [`@metamask/connect-evm`](../connect-evm) / [`@metamask/connect-solana`](../connect-solana)
adapters.

Telemetry is controlled by the `analytics.enabled` option on the connect clients
(defaults to `true`). Set `analytics.enabled: false` to disable all events and the
wallet-correlation metadata they carry.

## Installation

```bash
yarn add @metamask/analytics
```

or

```bash
npm install @metamask/analytics
```

## How it works

The package exports a single shared `analytics` instance. Events are queued in memory and
flushed in batches to the MetaMask analytics endpoint, with exponential backoff on failure.
Nothing is sent until analytics are explicitly enabled.

```typescript
import { analytics } from '@metamask/analytics';

// Telemetry is a no-op until enabled (the connect clients call this for you
// when `analytics.enabled` is true).
analytics.enable();

// Properties merged into every subsequent event.
analytics.setGlobalProperty('anon_id', anonId);
analytics.setGlobalProperty('integration_types', ['wagmi']);
```

### Endpoint

The default endpoint is `https://mm-sdk-analytics.api.cx.metamask.io/`. It can be overridden
at build time via the `METAMASK_ANALYTICS_ENDPOINT` or `NEXT_PUBLIC_METAMASK_ANALYTICS_ENDPOINT`
environment variables (resolved when the module is first loaded).

### Batching

Events are batched by an internal `Sender` (batch size `100`, base flush window `200ms`).
On a failed `POST /v2/events`, the failed batch is re-queued and the flush interval backs
off exponentially up to `30s`, resetting on the next success.

## API

The package exports a singleton `analytics` (an instance of the internal `Analytics`
class).

### `analytics.enable()`

Enables telemetry. Until this is called, `track()` is a no-op.

### `analytics.disable()`

Disables telemetry and **drops any queued events** (cancels the pending flush).

### `analytics.setGlobalProperty(key, value)`

Sets a property that is merged into every event emitted afterwards.

`integration_types` is special-cased: values are merged and de-duplicated across calls
rather than overwritten, so multiple integrations (for example `wagmi` plus a manual
integration) accumulate.

### `analytics.track(eventName, properties)`

Queues an event for sending. No-op while disabled. Each event is wrapped with the
`metamask/connect` namespace and the accumulated global properties before being enqueued.

## Events

`track()` accepts one of the following event names (see `src/schema.ts` for the full
payload shape of each):

| Group      | Events                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Connection | `mmconnect_connection_initiated`, `mmconnect_connection_established`, `mmconnect_connection_rejected`, `mmconnect_connection_failed`           |
| Action     | `mmconnect_wallet_action_requested`, `mmconnect_wallet_action_succeeded`, `mmconnect_wallet_action_failed`, `mmconnect_wallet_action_rejected` |

Connection events carry a `transport_type` of `browser` (extension), `mwp`, or
`unknown`, reflecting the transport selected by the multichain client.

## Content Security Policy

When analytics are enabled, the host page must allow the analytics endpoint:

```
connect-src https://mm-sdk-analytics.api.cx.metamask.io;
```

This is unnecessary when consumers set `analytics.enabled: false`. See the
[monorepo README](https://github.com/MetaMask/connect-monorepo#readme) for the full CSP
guidance.

## TypeScript

This package is written in TypeScript and includes full type definitions. No additional
`@types` package is required.

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the
[monorepo README](https://github.com/MetaMask/connect-monorepo#readme).

## License

MIT
