# Browser Playground

A browser-based test dapp for the MetaMask Connect

## Overview

This playground is part of the MetaMask Connect monorepo and provides a comprehensive testing environment for:

- **Multichain API**: Connect to multiple chains simultaneously (Ethereum, Linea, Polygon, Solana, etc.)
- **Legacy EVM Connector**: Backwards-compatible connection for EVM chains
- **Wagmi Integration**: Test the wagmi connector for React applications

## Prerequisites

- Node.js (>=20.19.0)
- Yarn (v4.1.1+)

## Installation

From the **monorepo root**:

```bash
# Install all dependencies
yarn install

# Build workspace packages
yarn build
```

## Configuration

```bash
cp .env.example .env
```

Then fill out the resulting `.env` file:

```env
INFURA_API_KEY=your_infura_api_key
```

## Usage

From the **monorepo root**:

```bash
yarn workspace @metamask/browser-playground start
```

Or from this directory:

```bash
yarn start
```

This launches the development server at `http://localhost:3000`.

## Features

### Multichain Connection

Connect to multiple blockchain networks in a single session:

- Ethereum Mainnet & Testnets
- Layer 2 networks (Linea, Arbitrum, Polygon, etc.)
- Solana

### Legacy EVM Connector

Toggle between multichain and legacy EVM modes to test backwards compatibility with existing dapps.

### Wagmi Connector

Test the wagmi integration for React applications with persistent sessions and multichain support.

## Manually testing analytics events

The playground emits analytics events via `@metamask/analytics` to whatever endpoint `METAMASK_ANALYTICS_ENDPOINT` resolves to (defaults to the production sink). For local verification — confirming a new property landed, a classifier picked the right bucket, a new event fired at all — you can point the playground at a local echo server and use the in-page **Analytics test bench** section to drive each code path.

### One-time setup

The pieces below are already wired up in this repo; this is just so you know what's involved if anything looks off:

- **`scripts/analytics-echo-server.mjs`** — a tiny Node HTTP server that accepts `POST /v2/events` and pretty-prints every event with `event_name`, `failure_reason`, `method`, and `transport` highlighted.
- **`craco.config.js`** — `DefinePlugin` is patched to forward `process.env.METAMASK_ANALYTICS_ENDPOINT` into the browser bundle. CRA's default behaviour only exposes `REACT_APP_*` vars, so without this the override would silently do nothing.
- **`public/index.html`** — the `Content-Security-Policy` meta tag's `connect-src` allowlist includes `http://localhost:*` and `http://127.0.0.1:*` so the browser is allowed to reach a local sink. Without this the browser drops the request and the Network tab shows nothing — the only hint is a CSP refusal in the console.
- **`src/components/AnalyticsTestBench.tsx`** — the collapsible "Analytics test bench" section in the playground UI, with one button per `classifyFailureReason` branch.

### Step-by-step

1. **Start the echo server** in one terminal:

   ```bash
   yarn analytics:echo
   # → analytics echo server listening on http://localhost:8787
   ```

2. **Start the playground** in another terminal with the endpoint override:

   ```bash
   METAMASK_ANALYTICS_ENDPOINT="http://localhost:8787/" yarn start
   ```

   (You can also put `METAMASK_ANALYTICS_ENDPOINT=http://localhost:8787/` in your `.env` — it goes through the same `DefinePlugin` path.)

3. **Open** `http://localhost:3000` (or whatever port CRA picked), connect via the Multichain card.

4. **Expand "Analytics test bench"** at the top of the page. Each button drives a request shape designed to land in a specific `failure_reason` bucket on `mmconnect_wallet_action_failed`. Watch the echo-server terminal — events arrive within a couple hundred ms.

   The bench keeps an in-page "Recent triggers" log showing the raw `name` / `code` / `msg` the wallet returned, so you can cross-reference what the wallet sent vs which bucket the classifier picked.

### Triggering buckets that need manual setup

Two buckets aren't deterministically reachable from a button:

- **`transport_timeout`** — toggle DevTools → Network → "Offline", then click any wallet-bound trigger, then wait ~30s for the SDK timeout.
- **`transport_disconnect`** — click a wallet-bound trigger, then disable/quit the MetaMask extension before approving.

Both buttons in the bench just print these instructions in an alert.

### Gotcha: multichain scope rules

On a CAIP-25 multichain session, the wallet's permission layer rejects any method not in the granted scope with EIP-1193 `4100 Unauthorized` **before** the method handler runs ([source](https://github.com/MetaMask/core/blob/main/packages/multichain-api-middleware/src/handlers/wallet-invokeMethod.ts)). So buttons like "bogus method" and "switch chain to 0xfa" all land in `wallet_unauthorized`, even though they'd produce different codes (`-32601` / `4902`) if the wallet got to run its handlers. The bench labels reflect this — see the in-page "Heads up" note.

### Verifying the endpoint override took effect

If events aren't arriving at the echo server, the env var probably didn't make it into the bundle. Quick check:

```bash
curl -s http://localhost:3000/static/js/bundle.js | grep -o 'localhost:8787[^"]*' | head -1
# → localhost:8787/
```

If that prints nothing, the bundle is still pointing at the production endpoint — restart `yarn start` with the env var set in the same shell.

## Project Structure

```
browser-playground/
├── src/
│   ├── App.tsx                    # Main application component
│   ├── components/
│   │   ├── AnalyticsTestBench.tsx # Collapsible bench for driving each failure_reason branch
│   │   ├── DynamicInputs.tsx      # Checkbox selection UI
│   │   ├── FeaturedNetworks.tsx   # Network selection component
│   │   ├── LegacyEVMCard.tsx      # Legacy EVM connector card
│   │   ├── ScopeCard.tsx          # Network scope with method invocation
│   │   ├── WagmiCard.tsx          # Wagmi connector card
│   │   └── WalletList.tsx         # Wallet selection component
│   ├── helpers/                   # Platform-specific helpers
│   ├── sdk/
│   │   ├── SDKProvider.tsx        # Multichain SDK context
│   │   ├── LegacyEVMSDKProvider.tsx # Legacy EVM SDK context
│   │   └── index.ts
│   └── wagmi/
│       ├── config.ts              # Wagmi configuration
│       └── metamask-connector.ts  # Auto-generated connector
├── scripts/
│   ├── analytics-echo-server.mjs  # Local POST /v2/events sink for manual analytics testing
│   ├── copy-wagmi-connector.js    # Copies wagmi connector from integrations/
│   └── README.md                  # Script documentation
└── public/
```

## Shared Code

This playground uses `@metamask/playground-ui` for shared constants, helpers, and types. See the [playground-ui README](../playground-ui/README.md) for details.

## Auto-Generated Files

The `src/wagmi/metamask-connector.ts` file is **auto-generated** from `integrations/wagmi/metamask-connector.ts`. See [scripts/README.md](./scripts/README.md) for details on why and how this works.

**Important**: Never edit `src/wagmi/metamask-connector.ts` directly. Edit `integrations/wagmi/metamask-connector.ts` instead.

## Contributing

See the [main repository contributing guide](../../docs/contributing.md) for development setup and guidelines.
