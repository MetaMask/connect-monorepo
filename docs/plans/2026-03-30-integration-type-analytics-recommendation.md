# Analytics `integration_type` — Analysis & Recommendation

**Date:** 2026-03-30
**Context:** Flagged during March 17 refinement — should we add a `connector_library` property to analytics events (separate from `integration_type`) to cleanly track RainbowKit, Dynamic, WAGMI, etc.?

---

## How It Works Today

**Data flow:**

```
Consumer app / connector library
  → createEVMClient({ analytics: { integrationType: 'wagmi' } })
      → connect-evm: defaults to 'direct' if not set
          → createMultichainClient (passes through as-is)
              → connect-multichain constructor: normalizes empty string → 'direct'
                  → analytics.setGlobalProperty('integration_types', ['wagmi'])
                      → appended to every tracked event as integration_types: string[]
```

**Current values in the wild:**

| Value | Set by | Location |
|---|---|---|
| `'wagmi'` | Wagmi connector | `integrations/wagmi/metamask-connector.ts:326` |
| `'direct'` | Default/fallback | `connect-evm/src/connect.ts:1036`, `connect-multichain/src/multichain/index.ts:142` |
| `'test'` | Test suites only | Various `*.test.ts` |

**Key architectural detail:** `integration_types` is already a **string array** in the analytics schema and uses a Set-merge strategy in `analytics.setGlobalProperty`. This means multiple SDK instances initializing in the same session accumulate values (e.g., `['wagmi', 'direct']`). The field is present on every event type across the schema.

---

## Can `integration_type` Handle RainbowKit, Dynamic, etc.?

The layers being conflated today:

| Layer | Examples | What it describes |
|---|---|---|
| Connector library | `wagmi`, `ethers`, `viem` | The low-level wallet connection library |
| Wallet UI wrapper | `rainbowkit`, `dynamic`, `web3modal` | The UI abstraction on top of the connector library |
| Integration mode | `direct` | No wrapper, SDK called directly |

RainbowKit ships its own wagmi connector adapter. So a RainbowKit user is simultaneously using RainbowKit (UI layer) and wagmi (connector layer). A single `integrationType: 'rainbowkit'` value would lose the wagmi signal; `integrationType: 'wagmi'` loses the RainbowKit signal. This is the crux of the ambiguity.

The array/merge behavior already in the codebase was clearly built anticipating this — the Set merge means you *can* set both `'rainbowkit'` and `'wagmi'` and both survive in the event. But the current API doesn't expose a clean way to do this: `MultichainOptions.analytics.integrationType` is a single string, not an array.

---

## Recommendation: Extend `integration_type`, Don't Add a Separate Field

**Don't add `connector_library` as a distinct property.** Reasons:

1. The Mixpanel schema already has `integration_types` as an array. Adding `connector_library` would be a second dimension that duplicates part of that signal and would need to be added to every event in `schema.ts` — a wider blast radius.
2. The Set-merge architecture is already solving the layering problem; it just needs a cleaner input API.
3. Two overlapping fields with unclear boundaries (`integration_type: 'rainbowkit'` vs `connector_library: 'wagmi'`) creates a harder Mixpanel query problem, not an easier one.

### Proposed Approach — Richer Taxonomy, Same Field, Array Input

Extend `MultichainOptions.analytics` to accept an array:

```typescript
analytics?: {
  integrationType: string | string[];  // accept array going forward
};
```

Define an explicit taxonomy (either as a string union or documented convention):

| Value | Layer | Description |
|---|---|---|
| `'direct'` | mode | SDK called directly, no wrapper |
| `'wagmi'` | connector | wagmi v1/v2/v3 connector |
| `'rainbowkit'` | ui-wrapper | RainbowKit on top of wagmi |
| `'dynamic'` | ui-wrapper | Dynamic.xyz wallet UI |
| `'web3modal'` | ui-wrapper | WalletConnect Web3Modal |

A RainbowKit integration would pass `integrationType: ['rainbowkit', 'wagmi']`. The existing Set-merge logic in `analytics.ts` handles this with zero changes.

---

## Migration Concerns

- **No Mixpanel schema change needed.** `integration_types` is already `string[]` everywhere in `schema.ts`. Adding new string values to the set is backwards-compatible.
- **Existing `'wagmi'` data is clean.** Direct wagmi users stay as `['wagmi']`. RainbowKit users currently emit nothing (no integration built yet) or `['wagmi']` if using the raw connector — after this change they'd emit `['rainbowkit', 'wagmi']`. That's additive.
- **The only code change** is the `MultichainOptions` type definition and the normalization in `connect-multichain/src/multichain/index.ts:142` to handle array input.
- **`'direct'` as default** remains correct and should stay — it's the meaningful signal that no wrapper was used.

### Short-Term Option (Reduced Scope)

If the full array API is too much scope right now: at minimum, define the taxonomy as a documented string enum and have the RainbowKit/Dynamic connectors (when built) set `integrationType: 'rainbowkit'` or `integrationType: 'dynamic'` rather than falling through to `'direct'`. That alone substantially improves Mixpanel segmentation without any schema changes. The array input API is a polish step on top.
