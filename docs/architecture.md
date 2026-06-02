# Architecture

This document describes how the packages in `connect-monorepo` fit together — how the
multichain client, the ecosystem adapters, and the transports compose. For per-package API
details, see each package's own README.

## Package topology

MetaMask Connect is layered. `@metamask/connect-multichain` is the client: it speaks the
CAIP-25 Multichain API, manages the session, and negotiates transports. The ecosystem
adapters (`connect-evm`, `connect-solana`) wrap the client to expose familiar,
ecosystem-specific surfaces (EIP-1193 and Wallet Standard).

```mermaid
%%{ init: { 'flowchart': { 'curve': 'bumpX' } } }%%
graph TD;
  subgraph Adapters["Ecosystem adapters"]
    connect_evm(["@metamask/connect-evm<br/>(EIP-1193)"]);
    connect_solana(["@metamask/connect-solana<br/>(Wallet Standard)"]);
  end
  subgraph Client["Multichain client"]
    connect_multichain(["@metamask/connect-multichain<br/>(CAIP-25 Multichain API)"]);
  end
  subgraph Support["Support packages"]
    multichain_ui(["@metamask/multichain-ui<br/>(connection UI)"]);
    analytics(["@metamask/analytics<br/>(telemetry)"]);
  end

  connect_evm --> connect_multichain;
  connect_solana --> connect_multichain;
  connect_evm --> analytics;
  connect_multichain --> analytics;
  connect_multichain --> multichain_ui;

  playgrounds(["Playgrounds<br/>(private, for testing)"]);
  playgrounds -.-> connect_evm;
  playgrounds -.-> connect_solana;
  playgrounds -.-> connect_multichain;
```

> The canonical, auto-generated dependency graph of the **published** packages lives in the
> [root README](../README.md#packages). This diagram adds the private playgrounds and the
> conceptual layering for context.

Key points:

- **One session, many ecosystems.** The EVM and Solana adapters both drive the same
  underlying `MultichainCore` instance, so a dapp using both shares a single CAIP-25
  session. `createMultichainClient` is a singleton per global context.
- **Adapters are optional.** A dapp can use `@metamask/connect-multichain` directly for the
  full scope-based API, or an adapter for a drop-in EIP-1193 / Wallet Standard experience.
- **Support packages are internal.** `multichain-ui` (connection UI) and `analytics`
  (telemetry) are pulled in transitively through `@metamask/connect-multichain`; dapps
  aren't intended to import them directly.

## Transport selection and composition

When a dapp calls `connect()`, the multichain client detects the platform and picks a
transport. Two concrete transports exist:

- **`DefaultTransport`** — direct messaging to the MetaMask **extension** and **mobile
  in-app browser** via `window.postMessage` (the `metamask-contentscript` channel).
- **`MWPTransport`** — remote connection to **MetaMask Mobile** over the Mobile Wallet
  Protocol. A `DappClient` connects through the relay
  (`wss://mm-sdk-relay.api.cx.metamask.io/connection/websocket`); the dapp shows a QR code (desktop) or deeplink
  (mobile native web / React Native) via `multichain-ui`, the wallet scans/opens it, and an
  end-to-end encrypted session is established.

Once a transport is connected, the client owns the CAIP-25 session and routes all RPC
through `wallet_invokeMethod`. The Multichain API is exposed two equivalent ways: directly
on the client (`connect` / `disconnect` / `invokeMethod`), and as a standard
[`@metamask/multichain-api-client`](https://www.npmjs.com/package/@metamask/multichain-api-client)
provider at `client.provider` (wired to the client by an internal adapter).

```mermaid
%%{ init: { 'flowchart': { 'curve': 'bumpX' } } }%%
graph TD;
  start(["createMultichainClient()"]) --> detect{"Platform detection<br/>isReactNative / isMetaMaskMobileWebView /<br/>isMobile + EIP-6963 extension presence"};

  detect -->|"in-app webview, OR<br/>desktop web + extension + preferExtension"| direct["DefaultTransport<br/>window.postMessage"];
  detect -->|"otherwise (no extension,<br/>mobile, node)"| mwp["MWPTransport<br/>DappClient"];

  direct --> ext["MetaMask Extension /<br/>Mobile in-app browser"];

  mwp -.->|"shows QR / deeplink"| ui["multichain-ui<br/>install modal / QR / deeplink"];
  mwp --> relay["Relay<br/>wss://mm-sdk-relay.api.cx.metamask.io/connection/websocket"];
  ui -.->|"QR scan / deeplink open"| mobile["MetaMask Mobile"];
  relay <-->|"E2E encrypted (ECIES)"| mobile;

  ext --> session["CAIP-25 session<br/>wallet_invokeMethod"];
  mobile --> session;

  store[("StoreAdapter / KV store<br/>web / RN / node")];
  session -.->|"persists transport type"| store;
  mwp -.->|"persists MWP pairing session<br/>(relay channel + ECIES keypair)"| store;
  store -.->|"restores transport type +<br/>MWP session on reload"| start;
```

Notes:

- **Platform entry points.** The client ships three builds — `index.browser.ts`,
  `index.native.ts`, `index.node.ts` — that differ only in their UI modals
  (`web` / `rn` / `node`) and storage adapter (`localStorage` / AsyncStorage / filesystem).
- **Resumption.** The selected transport *type* is persisted via the platform
  `StoreAdapter`. For MWP, the pairing session — the relay channel and the dapp's ECIES
  keypair — is persisted in the same KV store by the Mobile Wallet Protocol `SessionStore`,
  so the encrypted channel resumes across reloads without re-scanning. The CAIP-25 session
  itself (scopes + accounts) lives in the wallet and is re-fetched via `wallet_getSession`.
  On load the client restores the stored transport type (and, for the extension path,
  re-verifies extension presence) before resuming, so a connection survives page reloads
  without re-prompting.
- **Headless mode.** With `ui.headless: true`, the client skips `multichain-ui` and emits
  `display_uri` events so the dapp can render its own QR code.
- **Telemetry.** Connection events are reported through `@metamask/analytics` with a
  `transport_type` of `browser` (extension), `mwp`, or `unknown` — unless
  `analytics.enabled` is `false`.

## Connection lifecycle

The diagram above shows how the pieces compose; this one shows the order they run in — from
`createMultichainClient()` through connect, usage, and disconnect. Telemetry events fired
along the way are called out in the per-phase notes.

```mermaid
sequenceDiagram
  autonumber
  actor Dapp
  participant Client as connect-multichain
  participant Store as KV store
  participant UI as multichain-ui
  participant Wallet as MetaMask

  rect rgb(237, 242, 247)
    note right of Dapp: Init / resume
    Dapp->>Client: createMultichainClient()
    Client->>Store: getTransportType()
    alt stored transport
      Store-->>Client: browser | mwp
      Client->>Wallet: reconnect + wallet_getSession
      Wallet-->>Client: session scopes (connected)
    else none
      note over Client: status = loaded
    end
  end

  rect rgb(235, 244, 236)
    note right of Dapp: Connect
    Dapp->>Client: connect(scopes, accounts)
    note over Client: select transport<br/>(platform + extension presence)
    opt MWP only (mobile / no extension)
      Client->>UI: show QR / deeplink
      UI->>Wallet: user scans / opens (E2E via relay)
    end
    Client->>Wallet: wallet_createSession(scopes)
    alt user approves
      Wallet-->>Client: CAIP-25 session
      Client->>Store: setTransportType()
      Client-->>Dapp: connected
    else user rejects
      Wallet-->>Client: error
      Client-->>Dapp: throws
    end
    note over Client: telemetry: mmconnect_connection_initiated<br/>→ established / rejected / failed
  end

  rect rgb(244, 240, 247)
    note right of Dapp: Usage
    Dapp->>Client: invokeMethod(scope, request)
    Client->>Wallet: wallet_invokeMethod
    Wallet-->>Client: result
    Client-->>Dapp: result
    Wallet--)Client: wallet_sessionChanged
    Client--)Dapp: emit sessionChanged
    note over Client: telemetry: mmconnect_wallet_action_requested<br/>→ succeeded / failed / rejected
  end

  rect rgb(250, 244, 235)
    note right of Dapp: Disconnect
    Dapp->>Client: disconnect()
    Client->>Wallet: wallet_revokeSession
    Client->>Store: removeTransportType()
    note over Client,Wallet: extension transport stays alive to keep<br/>listening for wallet_sessionChanged
  end
```

## Further reading

- [Root README](../README.md) — integration options, getting started, CSP requirements.
- [`@metamask/connect-multichain`](../packages/connect-multichain/README.md) — client API and
  the CAIP standards it implements.
- [`@metamask/connect-evm`](../packages/connect-evm/README.md) /
  [`@metamask/connect-solana`](../packages/connect-solana/README.md) — adapter APIs.
- [`@metamask/multichain-ui`](../packages/multichain-ui/README.md) — connection UI components.
- [`@metamask/analytics`](../packages/analytics/README.md) — telemetry.
