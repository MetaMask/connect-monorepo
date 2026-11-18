/**
 * Seeds persisted MetaMask Connect (SDKConnectV2 / MWP) sessions in the iOS
 * simulator by firing synthetic trusted-mode connect deeplinks via
 * `xcrun simctl`.
 * Each seed performs a real relay handshake and persists a session that the
 * app resumes on every cold start — the background load PR #32475 defers.
 *
 * Usage:
 *   node seed-sessions.mjs                 # 18 sessions, 4s apart
 *   node seed-sessions.mjs 10              # 10 sessions
 *   node seed-sessions.mjs 10 6000         # 6s between connects
 *   node seed-sessions.mjs 3 0 --dry-run   # print URLs, don't open
 */
// eslint-disable-next-line import-x/extensions -- plain Node ESM script; the runtime import requires the file extension
import { buildConnectUrl, openDeeplink, sleep } from './lib.mjs';

const count = Number(process.argv[2] ?? 18);
const delayMs = Number(process.argv[3] ?? 4000);
const dryRun = process.argv.includes('--dry-run');

console.log(
  `Seeding ${count} MWP session(s), ${delayMs}ms apart${dryRun ? ' [dry-run]' : ''}`,
);

for (let seedIndex = 1; seedIndex <= count; seedIndex++) {
  const label = `Seed Dapp ${String(seedIndex).padStart(2, '0')}`;
  const { id, url } = buildConnectUrl(label);
  if (dryRun) {
    console.log(`[${seedIndex}/${count}] id=${id} ${url.slice(0, 100)}…`);
    continue;
  }
  console.log(`[${seedIndex}/${count}] ${label} (id=${id})`);
  // Open in-place (no terminate) so earlier handshakes finish undisturbed.
  await openDeeplink(url);
  if (seedIndex < count) {
    await sleep(delayMs);
  }
}

console.log(
  'Done. Verify the session count in the wallet UI, or count "connect_end" ' +
    'lines in the [MWPPerf] output.',
);
