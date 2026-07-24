#!/usr/bin/env node
/**
 * Runs one cold-start connect trial: force-terminates the simulator MetaMask,
 * then fires a fresh synthetic connect deeplink so the app cold-launches
 * straight into a new MWP connect while its persisted sessions resume.
 *
 * The [MWPPerf] `connect_end.durMs` for this trial's session id (printed
 * below) is the measurement. Collect it from the Metro terminal (run
 * `yarn watch | tee <arm>.log` so analyze.mjs can consume it).
 *
 * Usage:
 *   node run-trial.mjs             # one trial
 *   node run-trial.mjs 5           # five trials, 20s apart
 *   node run-trial.mjs 5 30000     # five trials, 30s apart
 */
import { buildConnectUrl, openDeeplink, sleep } from './lib.mjs';

const count = Number(process.argv[2] ?? 1);
const delayMs = Number(process.argv[3] ?? 20000);

for (let n = 1; n <= count; n++) {
  const { id, url } = buildConnectUrl(`Trial ${Date.now()}`);
  console.log(`[trial ${n}/${count}] session id=${id}`);
  // -t: terminate the app first so every trial is a true cold start.
  openDeeplink(url, { terminateFirst: true });
  if (n < count) {
    console.log(`  waiting ${delayMs}ms for resume/handshake to settle…`);
    await sleep(delayMs);
  }
}

console.log(
  'Done. Trials also persist as sessions — stay under the 20-connection cap ' +
    'or disconnect them between blocks (keep arms consistent).',
);
