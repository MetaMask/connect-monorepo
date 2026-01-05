# MetaMask Connect Monorepo Evolution

This document summarizes the evolution of the MetaMask Connect Monorepo from its inception, grouping changes thematically and highlighting major architectural decisions.

**Timeline:** October 2025 — January 2026  
**Total Merged PRs:** ~60  
**Releases:** 7 (1.0.0 through 7.0.0)

---

## Executive Summary

The connect-monorepo represents a **ground-up rewrite** of MetaMask's dapp connection SDK. It replaces the older MetaMask SDK with a modern, multichain-first architecture based on CAIP standards and the Multichain API.

**Key Architectural Decisions:**
1. **Multichain-first** — Built around CAIP-25 scopes rather than EVM-only
2. **Two transport layers** — Browser extension + Mobile Wallet Protocol
3. **Environment abstraction** — Single API across browser, Node, React Native
4. **EVM compatibility layer** — `connect-evm` wraps multichain API in EIP-1193

---

## Phase 1: Foundation (Oct 21-24, 2025)

### Initial Setup

| PR | Title | Status |
|----|-------|--------|
| #7 | feat: Route read only requests to RPC endpoint | ✅ Current |
| #8 | resolve initial build issues | ✅ Current |
| #10 | chore: bump @metamask/create-release-branch | ⚪ Infra |
| #11 | chore: update yarn constraints | ⚪ Infra |
| #12 | build: fix test:packages | ⚪ Infra |
| #14 | refactor: rename @metamask/multichain to @metamask/connect-multichain | ✅ Current |
| #15 | refactor: remove jest config | ⚪ Infra |
| #16 | **Release/1.0.0** | 📦 Release |
| #17 | build: optimize build command | ⚪ Infra |

**Key Decisions:**
- Package renamed from `@metamask/multichain` to `@metamask/connect-multichain`
- Migrated from Jest to Vitest for testing
- Established monorepo structure with yarn workspaces

### RPC Read-Only Routing (#7)

**What:** Introduced `RequestRouter` to route read-only RPC calls directly to configured endpoints instead of going through the wallet.

**Why:** Reduces latency and wallet burden for methods like `eth_blockNumber`, `eth_call`, etc.

**Impact:** Core architectural pattern that persists today.

---

## Phase 2: API Refinement (Oct 24-29, 2025)

| PR | Title | Status |
|----|-------|--------|
| #18 | docs: update README.md and package.json description | ⚪ Docs |
| #19 | feat: Remove api.infuraAPIKey SDK param. Export getInfuraRpcUrls | 🔄 Superseded |
| #22 | build: add valid deployment method for multichain-react-playground | ⚪ Infra |
| #25 | fix: tailwind style issue on react playground | ⚪ Infra |
| #26 | fix: switch to Bowser's default export to fix Vite build | ✅ Current |

### Infura API Key Removal (#19)

**What:** Removed `api.infuraAPIKey` parameter. Added `getInfuraRpcUrls(apiKey)` helper.

**Why:** Dapps should own their RPC configuration. Helper makes it easy but doesn't couple SDK to Infura.

**Note:** This was later further refined by the `supportedNetworks` rename (#37).

### Bowser Import Fix (#26)

**What:** Fixed Vite build by switching to Bowser's default export.

**Gotcha:** Platform detection uses Bowser for browser/mobile detection. Named exports broke tree-shaking.

---

## Phase 3: MWP Transport & EVM Layer (Nov 3-11, 2025)

| PR | Title | Status |
|----|-------|--------|
| #28 | fix: wrap multichain requests in multichain substream | ✅ Current |
| #29 | WIP: EVM Wrapper MwpTransport caching | ✅ Current |
| #30 | Fix add/switchChain not prompting for deeplink | ✅ Current |
| #21 | **feat: Legacy EVM Wrapper** | ✅ Current |
| #32 | chore: add build folders to eslint ignore | ⚪ Infra |
| #33 | feat: add support for read only RPC calls | 🔄 Evolved |
| #37 | refactor: rename readonlyRpcMap to supportedNetworks | ✅ Current |
| #38 | chore: bump @metamask/multichain-api-client | ⚪ Deps |
| #39 | Add button ids to legacy evm playground | ⚪ Infra |

### EVM Wrapper (#21) — Major Feature

**What:** Created `@metamask/connect-evm` package providing EIP-1193 compatible interface.

**Why:** Most dapps use `provider.request({ method, params })` pattern. This provides a familiar API while using multichain under the hood.

**Key Features:**
- `connect({ chainIds })` — Request multichain session
- `connectAndSign({ message })` — Connect + personal_sign in one call
- `connectWith({ method, params })` — Connect + any method
- `getProvider()` — Returns EIP-1193 compliant provider
- `switchChain()` — With automatic add-chain fallback

### MWP Transport Caching (#29)

**What:** Added local caching for `wallet_getSession`, `eth_accounts`, `eth_chainId` in MWP transport.

**Why:** Mobile connection is slow. Caching enables instant session recovery and reduces round-trips.

**Gotcha:** Cache stored in kvstore (IndexedDB/AsyncStorage). Must be invalidated on disconnect.

### Multichain Substream (#28)

**What:** Wrapped multichain requests in named substream (`metamask-provider`).

**Why:** Extension expects messages in specific format. Required for multichain API compatibility.

### Deeplink on Chain Switch (#30)

**What:** Added `openDeeplinkIfNeeded()` after `wallet_switchEthereumChain` and `wallet_addEthereumChain`.

**Why:** Mobile apps need explicit deeplink to return focus to wallet for approval.

### supportedNetworks Rename (#37)

**What:** Renamed `readonlyRpcMap` to `supportedNetworks`.

**Why:** Better reflects purpose — these are chains the dapp supports, used for both RPC calls and scope generation.

**Breaking Change:** API surface change, but happened before public release.

---

## Phase 4: Wagmi Integration (Nov 17-26, 2025)

| PR | Title | Status |
|----|-------|--------|
| #31 | **feat: wagmi connector** | ✅ Current |

### Wagmi Connector (#31) — Major Feature

**What:** Created Wagmi connector in `integrations/wagmi/`.

**Why:** Wagmi is the most popular React hooks library for Ethereum. Connector enables easy integration.

**Location:** Not a package, but an integration example/template.

---

## Phase 5: Release 7.0.0 & Facade Package (Dec 8, 2025)

| PR | Title | Status |
|----|-------|--------|
| #68 | fix deployment | 🔄 Reverted |
| #69 | Revert "fix deployment (#68)" | ⚪ Revert |
| #70 | setup/configure @metamask/connect root package | ✅ Current |
| #71 | **Release/7.0.0** | 📦 Release |
| #72 | fix deploy workflow | ⚪ Infra |

### @metamask/connect Facade Package (#70)

**What:** Created `@metamask/connect` as the public-facing package that re-exports multichain and evm.

**Why:** 
- Single package name for consumers
- Environment-specific bundling via conditional exports
- Future-proofs for additional chain-specific wrappers (e.g., Solana)

**Entry Points:**
```javascript
import { createMetamaskConnect } from '@metamask/connect';  // Multichain
import { createMetamaskConnectEVM } from '@metamask/connect/evm';  // EVM
```

---

## Phase 6: Bug Fixes & Stabilization (Dec 9-16, 2025)

| PR | Title | Status |
|----|-------|--------|
| #73 | feat: inline multichain-ui loading and QR code package import | ✅ Current |
| #74 | revert: Remove dangling branching logic for old sdk deeplinks | ✅ Current |
| #75 | fix: Initial deeplink connection rejection not updating status | ✅ Current |
| #76 | refactor: fix MultichainSDK typing | ⚪ Cleanup |
| #77 | feat: support multichain initial connections | ✅ Current |
| #78 | fix: changelog repo url | ⚪ Docs |
| #79 | fix: addEthereumChain not called on mobile after switchChain fails | ✅ Current |
| #81 | fix: clean up dangling event listeners | ✅ Current |
| #82 | fix type error on connectAndSign | ✅ Current |
| #83 | chore: specify minimum node version 20.19.0 | ⚪ Infra |
| #85 | fix: stuck connection by clearing old state | ✅ Current |
| #86 | fix: throw handleConnection error without rewrapping | ✅ Current |

### UI Lazy Loading (#73)

**What:** Made multichain-ui loading async, inlined QR code package.

**Why:** Reduces bundle size for apps that don't need connection UI (e.g., already connected).

### Multichain Initial Connections (#77)

**What:** Support for requesting multiple chains in initial connection.

**Why:** Dapps often support multiple chains. Single connection request for all.

### Event Listener Cleanup (#81)

**What:** Audited and fixed memory leaks from dangling event listeners.

**Why:** Session disconnect wasn't cleaning up all listeners, causing issues on reconnect.

### Stuck Connection Fix (#85)

**What:** Clear old state before new connection attempt.

**Why:** If user started connection, left page, returned — old state caused stuck "connecting" status.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Current | This change is part of current architecture |
| 🔄 Superseded | This change was later replaced/refined |
| 🔄 Evolved | Core idea remains, implementation evolved |
| ⚪ Infra | Infrastructure/tooling, not product code |
| ⚪ Docs | Documentation only |
| ⚪ Deps | Dependency updates |
| ⚪ Cleanup | Code cleanup, no behavior change |
| ⚪ Revert | Reverted change |
| 📦 Release | Release PR |

---

## Major Architectural Changes Timeline

```
Oct 2025
├── Initial repo structure from SDK migration
├── @metamask/connect-multichain core package
├── RequestRouter for RPC routing
└── Release 1.0.0

Nov 2025
├── @metamask/connect-evm package
├── MWP transport caching
├── supportedNetworks API
├── Wagmi connector
└── Releases 2.0.0 - 6.0.0

Dec 2025
├── @metamask/connect facade package
├── Multichain initial connections
├── Event listener cleanup
├── Connection stability fixes
└── Release 7.0.0

Jan 2026
└── (Current state)
```

---

## What You Might Have Missed

If you've been away since the SDK repo days, here are the key things to understand:

1. **New Package Names:**
   - `@metamask/connect` — Public API (NEW)
   - `@metamask/connect-multichain` — Core multichain logic
   - `@metamask/connect-evm` — EVM compatibility layer (NEW)

2. **Two Transports:**
   - `DefaultTransport` — For browser extension
   - `MWPTransport` — For mobile via WebSocket relay

3. **CAIP Standards:**
   - Scopes are CAIP-2 chain IDs: `eip155:1`, `eip155:137`
   - Accounts are CAIP-10: `eip155:1:0x1234...`

4. **Session Model:**
   - `wallet_createSession` instead of `eth_requestAccounts`
   - `wallet_invokeMethod` wraps all RPC calls
   - Session persists across page loads

5. **Configuration Required:**
   - Must provide `supportedNetworks` with RPC URLs
   - No more implicit Infura usage

6. **EVM Layer Handles:**
   - Chain switching with add-chain fallback
   - Account caching and event normalization
   - Session recovery on page load

---

## Open Areas / Future Work

Based on TODOs and patterns observed in the codebase:

1. **SDK_HANDLED_METHODS** — Currently falls back to wallet. Should resolve from cached state.
2. **Solana Support** — Infrastructure exists in domain types, not yet implemented.
3. **Better Error Types** — Many places use generic Error, could use typed errors.
4. **React Hooks** — No official React bindings yet (wagmi connector is workaround).

