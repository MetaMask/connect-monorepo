# MetaMask Connect — Event Handling

EVM provider and `connect-evm` event handling: EIP-1193 events, SDK `eventHandlers`, payload types, `display_uri` timing, EIP-6963 announcement, cached state, and listener best practices. For multichain `wallet_sessionChanged` see [multichain.md](multichain.md); for always-on core guardrails see [conventions.md](conventions.md).

## Contents

- [EIP-1193 Events (EVM Provider)](#eip-1193-events-evm-provider)
- [chainChanged Payload Type](#chainchanged-payload-type)
- [SDK eventHandlers (Client Options)](#sdk-eventhandlers-client-options)
- [display_uri Timing](#display_uri-timing)
- [Multichain stateChanged Event](#multichain-statechanged-event)
- [Transport Events](#transport-events)
- [EIP-6963 Provider Announcement](#eip-6963-provider-announcement)
- [Cached State Methods](#cached-state-methods)
- [Client Status Property](#client-status-property)
- [Event Listener Best Practices](#event-listener-best-practices)

## EIP-1193 Events (EVM Provider)

- **`connect`** — fired when the provider establishes a connection; payload: `{ chainId: Hex; accounts: Address[] }`
- **`disconnect`** — fired when the provider loses connection; **no payload**
- **`accountsChanged`** — fired when the user's accounts change; payload: `string[]` (array of addresses)
- **`chainChanged`** — fired when the active chain changes; payload: `string` (**hex** chain ID, not decimal)
- **`message`** — part of the EIP-1193 provider event _type_ (payload: `{ type: string; data: unknown }`), but **not currently emitted** by `@metamask/connect-evm`; don't rely on it for subscription delivery

```typescript
const provider = client.getProvider();

provider.on('accountsChanged', (accounts: string[]) => {
  console.log('New accounts:', accounts);
});

provider.on('chainChanged', (chainId: string) => {
  // chainId is HEX (e.g., '0x1'), NOT decimal
  console.log('New chain:', chainId);
});

provider.on(
  'connect',
  ({ chainId, accounts }: { chainId: string; accounts: string[] }) => {
    console.log('Connected to chain:', chainId, 'accounts:', accounts);
  },
);

provider.on('disconnect', () => {
  // No payload — the event itself is the signal
  console.log('Disconnected');
});
```

## chainChanged Payload Type

- `chainChanged` emits a **hex string** (e.g., `'0x1'`, `'0x89'`), **not a decimal number**
- Never compare directly with decimal numbers: `chainId === 1` will always be false
- Convert if needed: `parseInt(chainId, 16)` to get the decimal chain ID
- This is a common source of bugs — always treat chainChanged payload as a hex string

## SDK eventHandlers (Client Options)

- Configure event callbacks directly in client options via `eventHandlers`:
  - `connect` — same as EIP-1193 connect
  - `disconnect` — same as EIP-1193 disconnect
  - `accountsChanged` — same as EIP-1193 accountsChanged
  - `chainChanged` — same as EIP-1193 chainChanged
  - `displayUri` — fires with the connection URI string for QR code rendering
  - `connectAndSign` — fires with the signature result from `connectAndSign` flow
  - `connectWith` — fires with the result from `connectWith` flow

```typescript
const client = await createEVMClient({
  dapp: { name: 'My DApp' },
  eventHandlers: {
    accountsChanged: (accounts) => updateUI(accounts),
    chainChanged: (chainId) => updateChain(chainId),
    displayUri: (uri) => renderQrCode(uri),
  },
});
```

## display_uri Timing

- `display_uri` only fires during the `'connecting'` state — between calling `connect()` and the connection resolving
- Register the `display_uri` listener **before** calling `connect()` — registering after may miss the event
- The URI is a one-time-use pairing token; once used or expired, it cannot be reused
- On connection error, do not attempt to regenerate or reuse the QR — call `connect()` again for a new URI
- In non-headless mode, the SDK renders its own QR modal; `display_uri` is mainly useful in headless mode

## Multichain stateChanged Event

- The multichain core client emits `stateChanged` whenever the connection status changes
- Listen via `client.on('stateChanged', (status) => ...)` on the multichain client, where `status` is a `ConnectionStatus` string
- This is available on the multichain client (`createMultichainClient`) and on the Solana client's public `.core` property. The EVM client does **not** expose `.core` (it is private) — use `client.status` / provider events there

## Transport Events

- For the Mobile Wallet Protocol (MWP) transport, the SDK attempts to resume an interrupted session — including a reconnection check when the browser tab regains focus — so you generally don't need to wire this up manually. This resumption logic is MWP-specific; the browser-extension transport does not use it.
- The provider's `disconnect` event carries no error payload — treat the event itself as the signal, and do not expect legacy json-rpc-engine codes (e.g. `1013`) from the connect-\* packages

## EIP-6963 Provider Announcement

- Since `@metamask/connect-evm` 2.0.0, the MMConnect-managed EIP-1193 provider is announced through **EIP-6963** (`eip6963:announceProvider`) **by default** when native MetaMask has not already announced its own provider — so wallet-discovery UIs (RainbowKit, ConnectKit, Web3Modal, wagmi's `injected`/`metaMask` discovery, etc.) can surface the MMConnect provider automatically
- The auto-announce is suppressed when native MetaMask (extension) has already announced, and EIP-6963 extension detection is restricted to native MetaMask RDNS values so MMConnect announcements do not get mistaken for — or select — the browser-extension transport
- Pass `skipAutoAnnounce: true` to `createEVMClient()` to opt out of the automatic announcement (e.g. when you want to control discovery manually or avoid a duplicate entry alongside another integration)
- Call `client.announceProvider()` to re-announce on demand — useful after `skipAutoAnnounce`, or to re-emit in response to a late `eip6963:requestProvider` event from a discovery library that mounted after the SDK initialized

## Cached State Methods

- `eth_accounts` and `eth_chainId` return locally cached state from the SDK rather than making RPC calls
- The cached values are kept in sync via `accountsChanged` and `chainChanged` events, so they reflect the current state after connection
- Use `client.getChainId()` to get the current hex chain ID (returns `Hex | undefined`)
- Use `client.getAccount()` to get the current account address (returns `Address | undefined`)
- Since `@metamask/connect-evm` 1.3.1, the intercepted EIP-1193 account requests return method-specific shapes that match the spec: `provider.request({ method: 'eth_requestAccounts' })` resolves to an accounts array (`Address[]`), and `provider.request({ method: 'eth_coinbase' })` resolves to the **currently selected account** (`Address`), **not** the full accounts array. Do not destructure `eth_coinbase` as an array (`const [acct] = await provider.request({ method: 'eth_coinbase' })`) — treat it as a single address string
- Since `@metamask/connect-evm` 2.0.0, more intercepted EIP-1193 requests return spec-compatible values: `provider.request({ method: 'wallet_requestPermissions' })` resolves to the **requested permissions** array, while successful `wallet_switchEthereumChain` and `wallet_addEthereumChain` requests resolve to **`null`** (per EIP-3326 / EIP-3085). Do not expect a truthy value back from a successful switch/add — branch on the absence of a thrown error, not on the resolved value

## Client Status Property

- On the EVM client (`createEVMClient`), `client.status` is `ConnectEvmStatus`: `'connecting'`, `'connected'`, or `'disconnected'` (since `@metamask/connect-evm` 0.11.0 it no longer proxies `MultichainClient.status`)
- On the multichain client (`createMultichainClient`), `client.status` is the 5-value `ConnectionStatus`: `'loaded'`, `'pending'`, `'connecting'`, `'connected'`, or `'disconnected'`
- Use this for UI state management instead of tracking connection state manually

## Event Listener Best Practices

- Register event listeners before calling `connect()` to catch all events including initial state
- Remove listeners on component unmount to prevent memory leaks: `provider.removeListener('event', handler)`
- Do not register duplicate listeners — check if a listener is already registered before adding
- In React, use `useEffect` cleanup to remove listeners:

```typescript
useEffect(() => {
  const provider = client.getProvider();
  const handler = (accounts: string[]) => setAccounts(accounts);
  provider.on('accountsChanged', handler);
  return () => provider.removeListener('accountsChanged', handler);
}, [client]);
```
