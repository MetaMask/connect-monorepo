# @metamask/mwp-connect-bench

Private (unpublished) benchmark harness for **MetaMask Connect (Mobile Wallet
Protocol) deeplink connection latency** against a MetaMask Mobile dev build in
the iOS simulator.

Built to quantify the win from
[metamask-mobile#32475 — defer session resume/reconnect while a new connect is in flight](https://github.com/MetaMask/metamask-mobile/pull/32475)
(WAPI-1566) and to verify it causes no resume regressions — but reusable for
any MWP connect-latency experiment (see WAPI-1564 for the broader latency
investigation).

The rig uses real Safari/WebKit and real relay traffic. Simulator caveat: your
Mac's CPU is faster than device-class hardware, which *underestimates*
contention effects — if a measured delta is small, confirm on a physical
device before concluding a change isn't worth it.

## Contents

| File | Purpose |
| --- | --- |
| `patches/mwp-perf-instrumentation.patch` | Adds `[MWPPerf]` timing logs to metamask-mobile's `connection.ts` (+ helper module). **Not for merge** — apply locally to the build under test. |
| `seed-sessions.mjs` | Persists N synthetic MWP sessions (the cold-start resume load). |
| `run-trial.mjs` | One measurement trial: force-kill app → cold-start via a fresh connect deeplink. |
| `analyze.mjs` | Parses `[MWPPerf]` lines from tee'd Metro logs; prints medians + safety/contention indicators. |
| `lib.mjs` | Builds valid trusted-mode connect deeplinks (real secp256k1 keys via `eciesjs`), opens them via `mmdl`. |

## How the synthetic connects work

Trusted-mode MWP handshakes need **no dapp on the other end**: the wallet
connects to the relay, subscribes, publishes its handshake-offer, and persists
the session. A valid connect deeplink with **no `initialMessage`** (QR-style)
therefore creates a real persisted session with no approval UI — perfect for
seeding and for repeatable trials. Payloads pass every check in the wallet's
`isConnectionRequest()` validator, including the compressed-secp256k1
peer-key check.

## Prerequisites

- A `metamask-mobile` checkout (any path — you apply the patch inside it).
- `mmdl` CLI on PATH — opens deeplinks in the simulator MetaMask
  (env overrides: `MMDL_BUNDLE_ID`, `MMDL_DEVICE`). Any equivalent of
  `xcrun simctl openurl booted <url>` with optional pre-terminate also works.
- Booted iOS simulator with a dev build of MetaMask, onboarded (wallet created).
- `yarn install` at the monorepo root (installs this package's `eciesjs`).

## Quick start

```bash
BENCH_DIR=$(pwd)  # this package's directory

# 1. In your metamask-mobile checkout, on the branch under test:
cd ~/path/to/metamask-mobile
git apply "$BENCH_DIR/patches/mwp-perf-instrumentation.patch"

# 2. Build once, keep Metro output tee'd (the [MWPPerf] lines land there)
yarn setup:expo
yarn watch | tee "$BENCH_DIR/arm-pr.log"     # terminal 1
yarn start:ios                               # terminal 2

# 3. Onboard the sim wallet, then seed the resume load (persists in the sim)
cd "$BENCH_DIR"
yarn seed                # 18 sessions, 4s apart   (yarn seed 10 6000 …)

# 4. Run trials
yarn trial 5             # 5 cold-start trials, 20s apart

# 5. Switch arms (see below), re-tee Metro to arm-control.log, rerun step 4

# 6. Compare
yarn analyze arm-control.log arm-pr.log
```

## A/B arm switching for metamask-mobile#32475

The PR's behavior lives entirely in
`app/core/SDKConnectV2/services/connection-registry.ts`, and `main` has not
touched that file since the PR's merge-base — so both arms run on **one native
build** with a JS-only file swap (Metro hot-reloads it):

```bash
# control arm (pre-PR behavior):
git checkout origin/main -- app/core/SDKConnectV2/services/connection-registry.ts
# treatment arm (the PR):
git checkout perf/mwp-defer-resume-during-connect -- app/core/SDKConnectV2/services/connection-registry.ts
```

The instrumentation patch touches only `connection.ts` (identical on both
branches), so it stays constant across arms.

## Measurement protocol

- **≥10 trials per arm**, alternated in blocks (ABBA) so network drift doesn't
  bias one arm.
- **Throttle the network** (Network Link Conditioner on the Mac affects
  simulator traffic) — relay round-trips are what contend, so throttling
  amplifies the effect under test.
- Compare **medians / p75**, not means (relay latency is long-tailed). On a
  warm network with few sessions, expect a no-op — contention fixes cut the
  tail, not the average case.
- Watch the two safety signals in `analyze.mjs` output:
  - `resumes: N total, 0 failed` with N matching your seed count on **both**
    arms (no resumes lost — the regression check);
  - `resume_start events inside a connect window` — >0 on the contending arm,
    0 when deferral is working.

## Trial hygiene

- Every trial's connect **persists as a session** (wallet cap:
  `MAX_CONNECTIONS = 20`, oldest evicted). Disconnect trial sessions between
  blocks or let the cap hold — just be consistent across arms so both resume
  the same load.
- Seeded state lives in the simulator app container: survives cold starts
  (intended), wiped by `simctl erase`/reinstall. Sessions expire after the
  standard 30-day TTL.
- Each seed/trial shows the "Connecting to dApp" toast (auto-dismisses ~10s) —
  harmless.

## Cleanup (de-instrument metamask-mobile)

```bash
cd ~/path/to/metamask-mobile
git checkout -- app/core/SDKConnectV2/services/connection.ts
rm app/core/SDKConnectV2/services/mwp-perf.ts
```

## Maintenance note

`patches/mwp-perf-instrumentation.patch` targets metamask-mobile's
`app/core/SDKConnectV2/services/connection.ts` as of July 2026. If it stops
applying cleanly, regenerate it: add `mwp-perf.ts` (see the patch content) and
wrap `Connection.create` / `connect` / `resume` with start/end timing logs.
