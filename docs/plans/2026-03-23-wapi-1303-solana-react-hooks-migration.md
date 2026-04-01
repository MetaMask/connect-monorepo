# WAPI-1303: Migrate browser-playground Solana connection to @solana/react-hooks

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `@solana/wallet-adapter-react` + `@solana/wallet-adapter-react-ui` with `@solana/react-hooks` (framework-kit) in the browser-playground, migrating all Solana hooks and transaction primitives to the web3.js v2 equivalents.

**Architecture:** `createSolanaClient` from `@metamask/connect-solana` registers the MetaMask Connect wallet in the wallet-standard registry before the React provider mounts. `<SolanaProvider>` from `@solana/react-hooks` discovers the registered wallet automatically via wallet-standard and provides the connection context. Signing and RPC calls move from wallet-adapter patterns to framework-kit patterns.

**Tech Stack:** `@solana/react-hooks`, `@solana/kit` (web3.js v2), `@solana-program/system`, React 19, Craco/Webpack

---

## Background: API Differences Reference

| Concern | wallet-adapter (current) | framework-kit (target) |
|---|---|---|
| Provider | `<ConnectionProvider>` + `<WalletProvider>` + `<WalletModalProvider>` | `<SolanaProvider rpcUrl={...}>` |
| Auto-connect | `autoConnect` prop on `WalletProvider` | Built-in `WalletPersistence` via `localStorage` |
| Wallet state | `useWallet()` → flat fields (`connected`, `publicKey`, ...) | `useWallet()` → discriminated union; `useWalletSession()?.account.address` for pubkey |
| Connect | `wallets` array + `select(name)` | `useWalletConnection().connectors` + `connect(connectorId)` |
| Connector ID | Display name string `'MetaMask Connect'` | `'wallet-standard:metamask-connect'` |
| Disconnect | `disconnect()` from `useWallet()` | `useDisconnectWallet()` |
| RPC | `useConnection()` → `Connection` (v1) | `useSolanaClient().rpc` (v2) |
| Blockhash | `connection.getLatestBlockhash()` | `rpc.getLatestBlockhash().send()` → `{ value: { blockhash, ... } }` |
| Transaction | `new Transaction({ feePayer, recentBlockhash }).add(...)` | `createTransactionMessage` + `setTransactionMessageLifetimeUsingBlockhash` + `appendTransactionMessageInstruction` from `@solana/kit` |
| Sign message | `signMessage(bytes)` from `useWallet()` | `wallet.features['solana:signMessage'].signMessage(...)` |
| Sign tx | `signTransaction(tx)` from `useWallet()` | `wallet.features['solana:signTransaction'].signTransaction(...)` |
| Send tx | `sendTransaction(tx, connection)` from `useWallet()` | `wallet.features['solana:signAndSendTransaction'].signAndSendTransaction(...)` |
| Pre-built UI | `WalletMultiButton` | None — build custom UI with `useWalletConnection()` |

**Note on connector ID:** framework-kit normalizes wallet names to kebab-case for connector IDs. `'MetaMask Connect'` → `'wallet-standard:metamask-connect'`. Verify this by logging `useWalletConnection().connectors` after installation.

---

## Task 1: Research — Verify @solana/react-hooks package API

**Files:**
- Read: `node_modules/@solana/react-hooks/` (after install in Task 2) OR check npm source

**Context:** The `@solana/react-hooks` package is newer than training data. Before writing implementation code, verify the exact API signatures.

**Step 1: Check npm for latest version**

Run from `playground/browser-playground/`:
```bash
yarn info @solana/react-hooks version
yarn info @solana/kit version
yarn info @solana-program/system version
```

**Step 2: After installing (Task 2), inspect the package exports**

```bash
cat node_modules/@solana/react-hooks/dist/index.d.ts | head -100
```

Key things to verify:
- `SolanaProvider` props (especially: `rpcUrl`? or `rpc`? or children-only?)
- `useWalletConnection()` return shape (especially `connect` signature)
- `useWalletSession()` return shape (especially `account.address` type)
- `useDisconnectWallet()` return shape
- `useSolanaClient()` return shape (especially `.rpc` vs `.runtime`)
- How to access `signMessage`/`signTransaction`/`signAndSendTransaction` features

**Step 3: Verify connector ID format**

After wiring up the provider, add a temporary `console.log(connectors)` in App.tsx to see the exact connector ID strings from the wallet-standard wallet.

**Step 4: Commit nothing yet — this is a research task.**

---

## Task 2: Install new packages, remove old deps

**Files:**
- Modify: `playground/browser-playground/package.json`

**Step 1: Add new dependencies**

Run from `playground/browser-playground/`:
```bash
yarn add --dev @solana/react-hooks @solana/kit @solana-program/system
```

**Step 2: Remove old Solana wallet-adapter deps from package.json**

In `playground/browser-playground/package.json`, remove these from `devDependencies`:
- `"@solana/wallet-adapter-react": ...`
- `"@solana/wallet-adapter-react-ui": ...`

Note: Keep `"@solana/web3.js"` — it is still used by `src/helpers/solana-method-signatures.ts` (out of scope for this ticket).
Keep `"@solana/wallet-standard-chains"` if still used elsewhere (check with grep).

```bash
grep -r "@solana/wallet-standard-chains" src/
```

Remove if no usages found.

**Step 3: Run install**

```bash
yarn install
```

**Step 4: Verify the app still builds (it will have compile errors — that's expected)**

```bash
yarn build 2>&1 | head -50
```

Expected: TypeScript errors referencing wallet-adapter imports. No craco/webpack config errors yet.

**Step 5: Commit**

```bash
git add playground/browser-playground/package.json yarn.lock
git commit -m "chore(browser-playground): add @solana/react-hooks and @solana/kit deps"
```

---

## Task 3: Rewrite SolanaProvider.tsx

**Files:**
- Modify: `playground/browser-playground/src/sdk/SolanaProvider.tsx`

**Context:** The new provider must:
1. Initialize `createSolanaClient` (to register MetaMask Connect in wallet-standard) **before** the framework-kit `SolanaProvider` mounts
2. Wrap children with `<SolanaProvider>` from `@solana/react-hooks`
3. Expose a custom `SolanaSDKContext` for the `client`, `endpoint`, `setEndpoint` state (these are still needed by `SolanaWalletCard` and `App.tsx`)
4. Remove the `walletError` / `clearWalletError` pattern (errors are now local to each hook call site)

The `SolanaSDKContext` shape changes to:
```ts
type SolanaSDKContextType = {
  client: SolanaClient | null;
  isRegistered: boolean;
  endpoint: string;
  setEndpoint: (endpoint: string) => void;
};
```

**Step 1: Write the new SolanaProvider.tsx**

Replace the entire content of `playground/browser-playground/src/sdk/SolanaProvider.tsx` with:

```tsx
import { createSolanaClient, type SolanaClient } from '@metamask/connect-solana';
import { METAMASK_PROD_CHROME_ID } from '@metamask/playground-ui';
import { SolanaProvider as FrameworkKitSolanaProvider } from '@solana/react-hooks';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const SOLANA_DEVNET_ENDPOINT = 'https://api.devnet.solana.com';
const SOLANA_MAINNET_ENDPOINT = 'https://api.mainnet-beta.solana.com';

type SolanaSDKContextType = {
  client: SolanaClient | null;
  isRegistered: boolean;
  endpoint: string;
  setEndpoint: (endpoint: string) => void;
};

const SolanaSDKContext = createContext<SolanaSDKContextType | undefined>(
  undefined,
);

/**
 * Inner provider that initializes the Solana client and wraps children with
 * the framework-kit SolanaProvider. The client is initialized first so that
 * the MetaMask Connect wallet is registered in the wallet-standard registry
 * before the framework-kit provider mounts and discovers wallets.
 */
const SolanaClientInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [client, setClient] = useState<SolanaClient | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [endpoint, setEndpoint] = useState(SOLANA_DEVNET_ENDPOINT);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    createSolanaClient({
      dapp: {
        name: 'MetaMask Connect Playground',
        url: window.location.origin,
      },
      api: {
        supportedNetworks: {
          devnet: SOLANA_DEVNET_ENDPOINT,
          mainnet: SOLANA_MAINNET_ENDPOINT,
        },
      },
    })
      .then((solanaClient) => {
        setClient(solanaClient);
        setIsRegistered(true);
      })
      .catch((error) => {
        console.error('Failed to initialize Solana client:', error);
      });
  }, []);

  const contextValue = useMemo(
    () => ({ client, isRegistered, endpoint, setEndpoint }),
    [client, isRegistered, endpoint],
  );

  return (
    <SolanaSDKContext.Provider value={contextValue}>
      {/* SolanaProvider from framework-kit must mount AFTER client is registered.
          If isRegistered is false the wallet won't be in the registry yet,
          but framework-kit re-checks on connect() so we can mount early. */}
      <FrameworkKitSolanaProvider rpcUrl={endpoint}>
        {children}
      </FrameworkKitSolanaProvider>
    </SolanaSDKContext.Provider>
  );
};

/**
 * Main Solana provider that wraps the app with all necessary providers.
 */
export const SolanaWalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <SolanaClientInitializer>{children}</SolanaClientInitializer>;
};

/**
 * Hook to access the Solana SDK context.
 */
export const useSolanaSDK = () => {
  const context = useContext(SolanaSDKContext);
  if (context === undefined) {
    throw new Error('useSolanaSDK must be used within a SolanaWalletProvider');
  }
  return context;
};
```

**NOTE:** The `FrameworkKitSolanaProvider` props may differ from `rpcUrl={endpoint}`. After Task 1 research, adjust the prop name to match the actual API (it may be `endpoint`, `rpc`, or a config object).

**Step 2: Verify TypeScript compiles for this file**

```bash
cd playground/browser-playground
npx tsc --noEmit 2>&1 | grep SolanaProvider
```

Fix any prop name errors based on research from Task 1.

**Step 3: Commit**

```bash
git add playground/browser-playground/src/sdk/SolanaProvider.tsx
git commit -m "feat(browser-playground): rewrite SolanaProvider to use @solana/react-hooks"
```

---

## Task 4: Update App.tsx — migrate Solana connection logic

**Files:**
- Modify: `playground/browser-playground/src/App.tsx`

**Context:** `App.tsx` currently:
1. Imports `useWallet` from `@solana/wallet-adapter-react` to get `connected`, `connecting`, `disconnecting`, `publicKey`, `wallets`, `select`
2. Uses `wallets.find(...)` + `select(name)` to connect to MetaMask
3. Passes `solanaConnected` and `solanaPublicKey` to conditional renders

The new approach:
1. Import `useWalletConnection`, `useWalletSession` from `@solana/react-hooks`
2. `connected` → `useWalletSession() !== null`
3. `publicKey` → `useWalletSession()?.account.address`
4. `connect` → `useWalletConnection().connect('wallet-standard:metamask-connect')`

**Step 1: Remove wallet-adapter import, add framework-kit imports**

In `App.tsx`, replace:
```ts
import { useWallet } from '@solana/wallet-adapter-react';
```
with:
```ts
import { useWalletConnection, useWalletSession } from '@solana/react-hooks';
```

**Step 2: Replace the useWallet() destructuring block**

Remove:
```ts
const {
  connected: solanaConnected,
  connecting: solanaConnecting,
  disconnecting: solanaDisconnecting,
  publicKey: solanaPublicKey,
  wallets,
  select,
} = useWallet();
```

Replace with:
```ts
const { connect: connectSolanaWallet, connectors: solanaConnectors } = useWalletConnection();
const solanaSession = useWalletSession();
const solanaConnected = solanaSession !== null;
const solanaPublicKey = solanaSession?.account.address ?? null;
```

**Step 3: Replace connectSolana callback**

Remove:
```ts
const connectSolana = useCallback(async () => {
  clearSolanaError();
  const metamaskWallet = wallets.find((w) =>
    w.adapter.name.toLowerCase().includes('metamask connect'),
  );
  if (metamaskWallet) {
    select(metamaskWallet.adapter.name);
  } else {
    console.error('MetaMask wallet not found in registered wallets');
  }
}, [wallets, select, clearSolanaError]);
```

Replace with:
```ts
const connectSolana = useCallback(async () => {
  // framework-kit connector ID for the wallet-standard wallet named 'MetaMask Connect'
  // Verify this ID by logging solanaConnectors if connection fails
  const metamaskConnector = solanaConnectors.find((c) =>
    c.id === 'wallet-standard:metamask-connect',
  );
  if (metamaskConnector) {
    await connectSolanaWallet(metamaskConnector.id);
  } else {
    console.error('MetaMask Connect wallet not found. Available connectors:', solanaConnectors);
  }
}, [solanaConnectors, connectSolanaWallet]);
```

**Step 4: Remove walletError / solanaError references**

Remove from the destructuring of `useSolanaSDK()`:
```ts
const { walletError: solanaError, clearWalletError: clearSolanaError } = useSolanaSDK();
```

Change to:
```ts
const { /* walletError and clearWalletError removed */ } = useSolanaSDK();
```

Or just remove the `useSolanaSDK()` call entirely from App.tsx if it's only used for walletError (verify by searching App.tsx for other usages of `useSolanaSDK`).

Remove `solanaError` from the error display section (lines ~336-385 of current App.tsx). Remove the solanaError error block:
```tsx
{solanaError && (
  <p className="text-gray-700">
    <span className="font-semibold">Solana:</span>{' '}
    ...
  </p>
)}
```

And remove from the error section condition:
```tsx
{(error || legacyError || wagmiError || solanaError) && (
```
→
```tsx
{(error || legacyError || wagmiError) && (
```

**Step 5: Update section visibility condition for the Solana card**

The section at the bottom of App.tsx currently shows based on `solanaConnected && solanaPublicKey`. Since `solanaPublicKey` is now a string address (not a `PublicKey` object), `solanaPublicKey` truthiness check still works.

No change needed here.

**Step 6: TypeScript compile check**

```bash
npx tsc --noEmit 2>&1 | grep -E "App.tsx|react-hooks"
```

Fix any type errors (e.g., `solanaPublicKey` type changed from `PublicKey | null` to `string | null` — check all usages).

**Step 7: Commit**

```bash
git add playground/browser-playground/src/App.tsx
git commit -m "feat(browser-playground): migrate App.tsx Solana connect to framework-kit"
```

---

## Task 5: Rewrite SolanaWalletCard.tsx

**Files:**
- Modify: `playground/browser-playground/src/components/SolanaWalletCard.tsx`

**Context:** This file currently uses:
- `useConnection()` → `connection` (v1 RPC) for getting blockhash
- `useWallet()` → `publicKey`, `connected`, `disconnect`, `signMessage`, `signTransaction`, `sendTransaction`
- `@solana/web3.js` v1 primitives for building transactions

New approach:
- `useWalletSession()` for pubkey and wallet features access
- `useDisconnectWallet()` for disconnect
- `useSolanaClient()` for RPC (blockhash)
- `@solana/kit` v2 primitives for transaction building
- Direct wallet-standard feature access for signing

**Step 1: Replace imports**

Remove:
```ts
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
```

Add:
```ts
import { useWalletSession, useDisconnectWallet, useSolanaClient, useWalletConnection } from '@solana/react-hooks';
import {
  address,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  getBase64EncodedWireTransaction,
  compileTransaction,
  pipe,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
```

**NOTE:** The exact imports from `@solana/kit` need to be verified against the actual package after install. Key functions:
- `address(str)` — creates a `Address` from base58 string
- `createTransactionMessage({ version: 0 })` — creates a v0 transaction message
- `setTransactionMessageFeePayer(feePayerAddress, tx)` — sets the fee payer
- `setTransactionMessageLifetimeUsingBlockhash({ blockhash, lastValidBlockHeight }, tx)` — sets the lifetime
- `appendTransactionMessageInstruction(instruction, tx)` — adds an instruction
- `pipe(value, ...fns)` — utility for chaining transforms
- `compileTransaction(txMessage)` — compiles message to wire format
- `getTransferSolInstruction` from `@solana-program/system` — transfer instruction

Check actual exports:
```bash
cat node_modules/@solana/kit/dist/index.d.ts | grep -E "^export .*(createTransaction|setTransactionMessage|appendTransaction|compileTransaction|address|pipe)"
cat node_modules/@solana-program/system/dist/index.d.ts | grep "getTransferSol"
```

**Step 2: Replace hook usage**

Replace:
```ts
const { connection } = useConnection();
const { publicKey, connected, disconnect, signMessage, signTransaction, sendTransaction } = useWallet();
```

With:
```ts
const session = useWalletSession();
const { disconnect } = useDisconnectWallet();
const { connect, connectors } = useWalletConnection();
const client = useSolanaClient();

const connected = session !== null;
const publicKey = session?.account.address ?? null;
```

**Step 3: Rewrite handleSignMessage**

Replace:
```ts
const handleSignMessage = useCallback(async () => {
  if (!publicKey || !signMessage) {
    setError('Wallet not connected or signMessage not supported');
    return;
  }
  ...
  const signature = await signMessage(encodedMessage);
  setSignedMessage(Buffer.from(signature).toString('base64'));
```

With:
```ts
const handleSignMessage = useCallback(async () => {
  if (!session || !publicKey) {
    setError('Wallet not connected');
    return;
  }

  setLoading(true);
  setError(null);
  setSignedMessage(null);

  try {
    const encodedMessage = new TextEncoder().encode(message);

    // Access wallet-standard signMessage feature from the connected wallet
    const signMessageFeature = session.wallet.features['solana:signMessage'];
    if (!signMessageFeature) {
      setError('Wallet does not support signMessage');
      return;
    }

    const [{ signature }] = await signMessageFeature.signMessage({
      account: session.account,
      message: encodedMessage,
    });

    setSignedMessage(Buffer.from(signature).toString('base64'));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to sign message');
  } finally {
    setLoading(false);
  }
}, [session, publicKey, message]);
```

**NOTE:** `session.wallet.features` shape needs to be verified from Task 1 research. The `@solana/react-hooks` `useWalletSession()` return type may expose the wallet differently (e.g., `session.features` directly, or `session.wallet`).

**Step 4: Rewrite handleSignTransaction**

Replace the v1 transaction builder with v2 equivalents:

```ts
const handleSignTransaction = useCallback(async () => {
  if (!session || !publicKey) {
    setError('Wallet not connected');
    return;
  }

  setLoading(true);
  setError(null);
  setTransactionSignature(null);

  try {
    const { value: { blockhash, lastValidBlockHeight } } =
      await client.rpc.getLatestBlockhash().send();

    const senderAddress = address(publicKey);

    // Build a v0 transaction message (transfer to self, 0 lamports)
    const txMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(senderAddress, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(
        { blockhash, lastValidBlockHeight },
        tx,
      ),
      (tx) => appendTransactionMessageInstruction(
        getTransferSolInstruction({
          source: senderAddress,
          destination: senderAddress,
          amount: BigInt(0),
        }),
        tx,
      ),
    );

    const signTransactionFeature = session.wallet.features['solana:signTransaction'];
    if (!signTransactionFeature) {
      setError('Wallet does not support signTransaction');
      return;
    }

    const [{ signedTransaction }] = await signTransactionFeature.signTransaction({
      account: session.account,
      transaction: compileTransaction(txMessage),
    });

    // Extract first signature from the signed transaction
    const firstSignature = signedTransaction.signatures[0];
    if (firstSignature) {
      setTransactionSignature(Buffer.from(firstSignature).toString('base64'));
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to sign transaction');
  } finally {
    setLoading(false);
  }
}, [session, publicKey, client]);
```

**Step 5: Rewrite handleSendTransaction**

```ts
const handleSendTransaction = useCallback(async () => {
  if (!session || !publicKey) {
    setError('Wallet not connected');
    return;
  }

  setLoading(true);
  setError(null);
  setTransactionSignature(null);

  try {
    const { value: { blockhash, lastValidBlockHeight } } =
      await client.rpc.getLatestBlockhash().send();

    const senderAddress = address(publicKey);

    const txMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(senderAddress, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(
        { blockhash, lastValidBlockHeight },
        tx,
      ),
      (tx) => appendTransactionMessageInstruction(
        getTransferSolInstruction({
          source: senderAddress,
          destination: senderAddress,
          amount: BigInt(0),
        }),
        tx,
      ),
    );

    const sendTransactionFeature = session.wallet.features['solana:signAndSendTransaction'];
    if (!sendTransactionFeature) {
      setError('Wallet does not support signAndSendTransaction');
      return;
    }

    const [{ signature }] = await sendTransactionFeature.signAndSendTransaction({
      account: session.account,
      transaction: compileTransaction(txMessage),
    });

    setTransactionSignature(Buffer.from(signature).toString('base64'));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to send transaction');
  } finally {
    setLoading(false);
  }
}, [session, publicKey, client]);
```

**Step 6: Update the JSX — replace WalletMultiButton**

Remove:
```tsx
{!connected && (
  <div data-testid={TEST_IDS.solana.btnConnect} className="flex gap-2 flex-wrap">
    <WalletMultiButton className="!bg-blue-500 hover:!bg-blue-600" />
  </div>
)}
```

Replace with (connect button is handled from App.tsx, so this section just shows "not connected" state):
```tsx
{!connected && (
  <div data-testid={TEST_IDS.solana.btnConnect} className="flex gap-2 flex-wrap">
    <p className="text-sm text-gray-500">Use the &quot;Connect (Solana)&quot; button above to connect.</p>
  </div>
)}
```

**Step 7: Update publicKey display**

Current code does `publicKey.toBase58()` which is a v1 `PublicKey` method. In v2, `publicKey` (now `session?.account.address`) is already a base58 string.

Replace:
```tsx
<p className="text-sm font-mono break-all">{publicKey.toBase58()}</p>
```
With:
```tsx
<p className="text-sm font-mono break-all">{publicKey}</p>
```

**Step 8: Update disabled conditions on buttons**

Replace `disabled={loading || !signMessage}` with `disabled={loading || !session?.wallet.features['solana:signMessage']}` etc. for each button.

**Step 9: TypeScript compile check**

```bash
npx tsc --noEmit 2>&1 | grep SolanaWalletCard
```

Fix type errors from API shape mismatches found in Task 1 research.

**Step 10: Commit**

```bash
git add playground/browser-playground/src/components/SolanaWalletCard.tsx
git commit -m "feat(browser-playground): migrate SolanaWalletCard to @solana/react-hooks and @solana/kit v2"
```

---

## Task 6: Remove wallet-adapter CSS import from SolanaProvider.tsx

**Files:**
- Modify: `playground/browser-playground/src/sdk/SolanaProvider.tsx`

**Context:** The old SolanaProvider.tsx had `import '@solana/wallet-adapter-react-ui/styles.css'`. This import was removed in Task 3 when we rewrote the file, but verify it's gone and nothing else imports it.

**Step 1: Verify no remaining wallet-adapter imports**

```bash
grep -r "wallet-adapter" playground/browser-playground/src/
```

Expected: No matches. If there are any remaining imports, remove them.

**Step 2: Verify no remaining @solana/web3.js imports in the migrated files**

```bash
grep -r "@solana/web3.js" playground/browser-playground/src/components/SolanaWalletCard.tsx playground/browser-playground/src/sdk/SolanaProvider.tsx playground/browser-playground/src/App.tsx
```

Expected: No matches. (`@solana/web3.js` is still used in `solana-method-signatures.ts` — that's intentional and out of scope.)

**Step 3: Full build check**

```bash
cd playground/browser-playground
yarn build 2>&1 | tail -20
```

Expected: Build succeeds (or only pre-existing warnings, no new errors).

**Step 4: Commit (if any remaining cleanup changes)**

```bash
git add playground/browser-playground/src/
git commit -m "chore(browser-playground): remove remaining wallet-adapter references"
```

---

## Task 7: Verify auto-connect behavior

**Context:** The framework-kit `SolanaProvider` includes built-in `WalletPersistence` which stores the last connected wallet ID in `localStorage` under the key `solana:wallet` (or similar). On mount, it calls `connect({ autoConnect: true })` using the persisted `lastConnectorId`. This is the functional equivalent of `autoConnect` on the old `WalletProvider`.

**Step 1: Manual test — connect**

1. Start the playground: `yarn start`
2. Click "Connect (Solana)"
3. Approve in MetaMask
4. Verify Solana card appears showing "Connected" with the public key address

**Step 2: Manual test — auto-connect on reload**

1. With wallet connected, hard-reload the page (Cmd+Shift+R)
2. Verify wallet auto-reconnects without needing to click Connect again
3. Verify Solana card shows connected state

**Step 3: Manual test — disconnect**

1. Click "Disconnect" in the Solana card
2. Verify card shows "Not connected"
3. Verify "Connect (Solana)" button re-appears in the toolbar

**Step 4: Manual test — sign message**

1. Connect wallet
2. In Solana card, click "Sign Message"
3. Approve in MetaMask
4. Verify signed message appears in base64 format

**Step 5: Manual test — sign transaction**

1. Connect wallet
2. Click "Sign Transaction"
3. Approve in MetaMask
4. Verify transaction signature appears

**Step 6: Manual test — send transaction**

1. Connect wallet to devnet address with SOL balance
2. Click "Sign & Send"
3. Approve in MetaMask
4. Verify transaction signature appears

**Step 7: Manual test — singleton reflect behavior (multichain connect)**

1. Disconnect Solana wallet
2. Click "Connect (Multichain)" with `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` scope included
3. Verify the Solana card shows as connected, reflecting the multichain session

**Step 8: Commit final state**

```bash
git add -A
git commit -m "feat(browser-playground): complete @solana/react-hooks migration (WAPI-1303)"
```

---

## Task 8: Update lavamoat allowScripts (if needed)

**Files:**
- Modify: `playground/browser-playground/package.json` (lavamoat section)

**Context:** The `lavamoat.allowScripts` section in `package.json` currently has entries for `@solana/web3.js` sub-packages. The new `@solana/react-hooks` and `@solana/kit` packages may add new entries.

**Step 1: Check if lavamoat reports new entries needed**

```bash
cd playground/browser-playground
yarn allow-scripts 2>&1 | grep -E "^  Missing|solana"
```

**Step 2: Add any missing entries as `false` (deny install scripts for new packages)**

Only add entries that are reported as missing. Default to `false` for any new entries unless they are known to require install scripts.

**Step 3: Remove stale entries for removed packages**

Remove entries that no longer apply (e.g., `@solana/wallet-adapter-react-ui`-specific entries if any were added).

**Step 4: Commit if changed**

```bash
git add playground/browser-playground/package.json
git commit -m "chore(browser-playground): update lavamoat allowScripts for new Solana deps"
```

---

## Troubleshooting Guide

### Issue: `SolanaProvider` prop name wrong
**Symptom:** TypeScript error like `Property 'rpcUrl' does not exist on type 'SolanaProviderProps'`
**Fix:** Check `@solana/react-hooks` types for the exact provider prop. It may be `endpoint`, `rpc`, or a config object. Run: `cat node_modules/@solana/react-hooks/dist/index.d.ts | grep -A5 "SolanaProvider"`

### Issue: Connector ID doesn't match
**Symptom:** `connectSolana` logs "MetaMask Connect wallet not found" even after client is registered
**Fix:** Log `solanaConnectors` to find the actual ID:
```ts
console.log('Available Solana connectors:', solanaConnectors.map(c => c.id));
```
Update the connector ID string in `App.tsx` to match.

### Issue: Wallet registered too late (race condition)
**Symptom:** `@solana/react-hooks` doesn't discover the MetaMask wallet because `createSolanaClient` resolves after the provider has already scanned for wallets
**Fix:** `@solana/react-hooks` should listen for wallet-standard's `wallet-standard:register-wallet` event and update dynamically. If not, try moving `createSolanaClient` to run before `ReactDOM.createRoot` in `index.tsx` and pass the client down as a prop.

### Issue: v2 transaction building API mismatch
**Symptom:** TypeScript errors on `createTransactionMessage`, `setTransactionMessageFeePayer`, etc.
**Fix:** Check exact function names in `@solana/kit`:
```bash
cat node_modules/@solana/kit/dist/index.d.ts | grep -E "createTransaction|setTransaction|appendTransaction"
```
Some functions may have different signatures in the installed version.

### Issue: `session.wallet.features` type errors
**Symptom:** TypeScript doesn't recognize `session.wallet.features['solana:signMessage']`
**Fix:** Check the `WalletSession` type from `@solana/react-hooks`. Features may need to be accessed via `session.account` or cast through wallet-standard types. Look for:
```bash
cat node_modules/@solana/react-hooks/dist/index.d.ts | grep -A10 "WalletSession\|useWalletSession"
```

### Issue: CRA/Craco can't bundle @solana/kit (ESM issues)
**Symptom:** Build error mentioning "cannot parse" or "unexpected token" in `@solana/kit`
**Fix:** `@solana/kit` packages use modern ESM. The existing webpack rule in `craco.config.js` (`fullySpecified: false`) should handle most cases. If not, add an explicit CJS alias:
```js
// In craco.config.js resolve.alias:
'@solana/kit': require.resolve('@solana/kit/dist/index.cjs')
```
Check if `@solana/kit` has a CJS build in `node_modules/@solana/kit/dist/`.
