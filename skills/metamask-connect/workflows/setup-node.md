# Setup MetaMask Connect in Node.js (CLI / server)

## When to use

Use this skill when:

- Building a **headless** integration — a CLI tool, backend script, bot, or server-side process — with no browser DOM
- You want a Node process to connect to **MetaMask Mobile** by printing a QR code to the terminal
- You need EVM and/or Solana signing/sending from Node via the multichain client's `invokeMethod`
- You're porting browser MetaMask Connect code to a Node runtime and need to know what changes

In Node there is **no browser extension and no injected provider** — the only transport is the remote (mobile) flow: the SDK prints an ASCII QR code to the terminal, the user scans it with MetaMask Mobile, and the session runs over the relay WebSocket.

## Which client to use

`@metamask/connect-multichain` and `@metamask/connect-solana` ship dedicated **Node builds** (their package `exports` resolve a `node`/`import`/`require` target). `@metamask/connect-evm` ships a single environment-agnostic bundle that keeps `@metamask/connect-multichain` as an external dependency, so in Node it delegates to the multichain **node** build and runs headlessly too (the repo's `node-playground` exercises all three).

**Recommendation:** use `createMultichainClient` as the primary Node entry point — it has the most explicit Node packaging and one mental model (`invokeMethod` with CAIP-2 scopes) for both EVM and Solana. `createEVMClient` / `createSolanaClient` also run in Node if you prefer a single-chain surface; when you do, Solana operations go through `client.core.invokeMethod` / `client.core.connect` (the wallet-standard browser registration path is not used in Node).

## Workflow

### Step 1: Install

```bash
npm install @metamask/connect-multichain
```

**No polyfills are required.** Unlike React Native, Node provides `Buffer`, `crypto`, and `globalThis` natively, and there is no `window`/DOM to shim. (Content Security Policy is also irrelevant — it's a browser concern.)

### Step 2: Create the client

`dapp.url` is **required** in Node — there is no `window.location` to fall back to. The client is created with `await`; `createMultichainClient` is a singleton (later calls merge options but reuse the first `dapp`).

```typescript
import {
  createMultichainClient,
  getInfuraRpcUrls,
  type SessionData,
} from '@metamask/connect-multichain';

const client = await createMultichainClient({
  dapp: {
    name: 'My CLI Tool',
    url: 'https://my-cli.example.com', // required: no window.location in Node
  },
  api: {
    supportedNetworks: getInfuraRpcUrls({
      infuraApiKey: process.env.INFURA_API_KEY ?? 'demo',
      caipChainIds: ['eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    }),
  },
});
```

### Step 3: Listen for session changes, then connect

Register the listener **before** `connect()`. The connect call prints an ASCII QR code to the terminal (with a live countdown that regenerates on expiry) and resolves once the user approves in MetaMask Mobile.

```typescript
client.on('wallet_sessionChanged', (session?: SessionData) => {
  const scopes = session?.sessionScopes ?? {};
  for (const scope of Object.values(scopes) as { accounts?: string[] }[]) {
    // accounts are CAIP-10 strings, e.g. 'eip155:1:0xabc…' or
    // 'solana:5eykt4…:<address>' — the address is the last ':' segment
    for (const caipAccount of scope.accounts ?? []) {
      console.log('account:', caipAccount);
    }
  }
});

// Positional args: connect(scopes, caipAccountIds)
await client.connect(
  ['eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  [],
);
```

To render the QR yourself instead of the built-in terminal output, create the client with `ui: { headless: true }` and handle the `display_uri` event (see [setup-multichain.md](setup-multichain.md), Step 7).

### Step 4: Sign / send EVM via `invokeMethod`

`personal_sign` takes `[messageHex, account]`. Hex-encode the message (the browser's `eth_sendTransaction`/routing rules apply identically — EVM reads route to the RPC node, signing routes to the wallet).

```typescript
const account = '0xYourAddress';
const messageHex = `0x${Buffer.from('Hello from Node!', 'utf8').toString('hex')}`;

const signature = await client.invokeMethod({
  scope: 'eip155:1',
  request: {
    method: 'personal_sign',
    params: [messageHex, account],
  },
});
```

### Step 5: Sign / send Solana via `invokeMethod`

Solana messages are **base64-encoded**, params take an `account: { address }` object, and method names have no `solana_` prefix. All Solana methods route through the wallet.

```typescript
const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const messageBase64 = Buffer.from('Hello from Node!', 'utf8').toString('base64');

const result = await client.invokeMethod({
  scope: SOLANA_MAINNET,
  request: {
    method: 'signMessage',
    params: {
      account: { address: 'YourSolanaAddress' },
      message: messageBase64,
    },
  },
});
```

See [multichain-evm-operations.md](multichain-evm-operations.md) and [multichain-solana-operations.md](multichain-solana-operations.md) for the full method/param/return reference and `RPCInvokeMethodErr` handling.

### Step 6: Disconnect

```typescript
await client.disconnect(); // revoke all scopes, end the session
```

## Session persistence across runs

The default Node storage adapter (`StoreAdapterNode`) keeps session/transport metadata in an **in-memory `Map`**, so it does **not** survive a process restart — each run of your CLI starts fresh and shows a new QR code.

To keep a session alive between runs (e.g. so a recurring job doesn't re-prompt), pass your own `storage` — a `StoreClient` implementation (the package exports the `StoreClient` and `StoreAdapter` base classes to extend) backed by durable storage such as a file:

```typescript
const client = await createMultichainClient({
  dapp: { name: 'My CLI Tool', url: 'https://my-cli.example.com' },
  api: {
    /* … */
  },
  storage: myFileBackedStoreClient, // implements StoreClient
});
```

## Important Notes

- **Remote transport only** — no extension, no injected provider in Node. Connection always goes through MetaMask Mobile via the relay WebSocket; the SDK prints an ASCII QR code (via `@paulmillr/qr`) to the terminal for the user to scan.
- **`dapp.url` is required** — there is no `window.location` in Node.
- **No polyfills, no CSP** — Node has `Buffer`/`crypto`/`globalThis` natively; CSP is a browser-only concern.
- **Default storage is in-memory** — sessions are not persisted across process restarts unless you supply a custom `storage` (`StoreClient`).
- **`createMultichainClient` is a singleton** — create once at startup; later calls merge options but reuse the first `dapp`.
- **EVM read vs. sign routing is unchanged** — EVM reads (`eth_call`, `eth_getBalance`, …) route to the RPC node in `supportedNetworks`; signing methods and all Solana methods route to the wallet.
- **Error handling is identical to browser multichain** — handle `4001` (user rejected) on `connect()`, and `RPCInvokeMethodErr` (original code on `err.rpcCode`) on `invokeMethod`. See [setup-multichain.md](setup-multichain.md), Step 9.
