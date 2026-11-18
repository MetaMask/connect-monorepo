# Agent guide: mwp-connect-bench

Operational playbook for AI agents (and humans) running MWP connect-latency
experiments with this harness. The [README](./README.md) explains what the
harness is; this file is the "how to actually run it without stepping on the
known landmines" guide. Everything below was learned running the first real
A/B test (metamask-mobile#32475, July 2026).

## What this measures (and what it doesn't)

- **Measures**: wallet-side MWP connect-handshake latency
  (`connect_start → connect_end`), session-resume latency and success, resume
  contention inside connect windows, and (with `--with-request`) the approval
  gate (`create_session_received − connect_start`).
- **Does not measure**: dapp-side deeplink-open latency, time-to-modal-visible
  (UI render), Android, physical devices, untrusted-mode handshakes.

## Environment assumptions

- macOS with Xcode; deeplinks are delivered with `xcrun simctl` — there is no
  dependency on any private CLI.
- Env overrides: `BENCH_SIM_DEVICE` (simulator UDID, default `booted`),
  `BENCH_BUNDLE_ID` (default `io.metamask.MetaMask`; QA builds use
  `io.metamask.MetaMask-QA`).
- A booted simulator with MetaMask installed and **onboarded** (wallet
  created). Transport-level metrics (connect/resume) are collected even while
  the wallet is locked; approval-path metrics need it unlocked.
- Run `yarn install` at the monorepo root first (this package needs
  `eciesjs`).

## Playbook A — quick check on a dev build (Metro attached)

Use when a rough signal is enough and the branch difference is JS-only.

1. In the metamask-mobile checkout, on the branch under test:
   `git apply <this-dir>/patches/mwp-perf-instrumentation.patch`
2. `yarn setup:expo`, then `yarn watch | tee arm-<name>.log` and
   `yarn start:ios`.
3. Seed the resume load once: `yarn seed` (18 sessions, persists in the sim).
4. `yarn trial 8 30000` per arm; swap arms (see README); re-tee to a new log.
5. `yarn analyze arm-control.log arm-pr.log`.

**Caveat**: dev builds boot into the Expo dev-launcher on cold start, which
swallows the deeplink — so dev-build trials are _not_ true cold starts. For
cold-start-sensitive changes use Playbook B.

## Playbook B — faithful cold-start A/B (Release build)

This is the protocol that produced the #32475 numbers.

1. Apply the instrumentation patch (as above) on the **control** arm's code
   (usually `main` + the patch).
2. Build a Release simulator app (embedded JS bundle, no Metro, no
   dev-launcher):

   ```bash
   cd <metamask-mobile>/ios
   xcodebuild -workspace MetaMask.xcworkspace -scheme MetaMask \
     -configuration Release -sdk iphonesimulator -derivedDataPath build \
     -destination 'platform=iOS Simulator,id=<UDID>' build
   xcrun simctl install <UDID> build/Build/Products/Release-iphonesimulator/MetaMask.app
   ```

3. Onboard the wallet in the freshly installed app, then `yarn seed`.
4. Rotate the on-device log, run the arm, collect:

   ```bash
   DATA=$(xcrun simctl get_app_container <UDID> <bundle-id> data)
   rm -f "$DATA/Documents/mwp-perf.log"
   yarn trial 8 40000        # allow extra settle time under throttle
   sleep 45                  # let the last trial's resumes finish
   cp "$DATA/Documents/mwp-perf.log" arm-<name>.log
   ```

5. Swap the arm (JS-only file swap per README), **re-run the xcodebuild from
   step 2** (incremental, but required — there is no Metro to hot-reload, and
   the bundle must be re-embedded), reinstall, repeat step 4.
6. `yarn analyze arm-control.log arm-pr.log`.

## Known pitfalls (each of these cost real time)

- **Expo dev-launcher swallows cold-start deeplinks.** Dev-client builds are
  unusable for cold-start trials. Use a Release build.
- **`transform-remove-console` strips `console.*` in Release builds.** The
  instrumentation survives via a bound `console.warn` alias and by appending
  to `Documents/mwp-perf.log`. If you edit `mwp-perf.ts`, do not introduce a
  direct `console.warn(...)` member call and expect it to survive Release.
- **After swapping a JS file between arms you must rebuild.** An installed
  Release app has the bundle baked in; verify the swap took effect by
  checking `main.jsbundle`'s mtime inside the built `.app` before installing.
- **Release builds are resource-hungry.** Tens of GB of intermediates in
  `ios/build`, heavily parallel compile. Check free disk _and_ free memory
  first; never run two xcodebuilds against the same `-derivedDataPath` (the
  build DB locks, and interrupted builds can leave a hung build-service
  process holding the lock — kill it by PID before retrying).
- **Every trial persists a session.** The wallet caps at
  `MAX_CONNECTIONS = 20` (oldest evicted). Keep the seeded count + trial
  count consistent across arms so both resume the same load.
- **One resume per trial can still land inside the connect window** on a
  deferral arm: a resume already in flight when the deeplink arrives cannot
  be preempted. `resume_start events inside a connect window` dropping to
  ~1 per trial (not 0) is expected there.
- **Give trials generous spacing** (`yarn trial <n> <ms>`): the connect
  handshake plus ~20 sequential session resumes must finish before the next
  terminate, or you bias the next trial. 30 s unthrottled, 40 s+ throttled.
- **Network throttling amplifies the signal** (relay round-trips are what
  contend). macOS Network Link Conditioner affects simulator traffic.
  Verify the throttle is actually active before trusting a throttled run
  (e.g. `curl -w '%{time_connect}'` against the relay host) — and turn it
  off afterwards.

## Interpreting analyze.mjs output

- Compare **median / p75**, never means (relay latency is long-tailed).
- `connects: N ok, 0 failed` and `resumes: M total, 0 failed` on **both**
  arms are the safety/regression gates; a delta with failed resumes is
  invalid.
- On a warm unthrottled network with few sessions, a null result is normal —
  contention fixes cut the tail, not the base case. Throttle and/or raise
  the seeded-session count before concluding "no effect".

## Extending the harness

- **New timing hypothesis**: add `mwpPerf('<event>', id, {...})` call sites
  to the instrumentation patch, then teach `analyze.mjs` the new event pair.
  Events are JSON lines `{ event, id, t, ...extra }`; `t` is ms since JS
  module load (per-session ordering only — never compare `t` across app
  launches).
- **Patch rot**: the patches target `connection.ts` as of July 2026. If
  `git apply` fails, regenerate: add `mwp-perf.ts` (copy from the patch) and
  wrap `Connection.create` / `connect` / `resume` with start/end events.
  Keep `mwp-perf.ts` identical across all patch variants.
- **Branches that refactor `connection.ts`** need their own patch variant
  (see `mwp-perf-instrumentation.h1-32470.patch` as the template).
