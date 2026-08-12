/**
 * Parses [MWPPerf] lines from one or more log files (e.g. tee'd Metro output)
 * and prints per-file connect/resume stats plus a contention indicator.
 *
 * Usage:
 *   node analyze.mjs arm-control.log arm-pr.log
 */
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  throw new Error('Usage: node analyze.mjs <log file> [more log files…]');
}

const percentile = (sorted, pct) =>
  sorted.length === 0
    ? NaN
    : sorted[
        Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))
      ];

for (const file of files) {
  const events = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    // Two supported formats:
    //  - Metro/console capture: "... [MWPPerf] {json}" (dev builds)
    //  - Raw file capture: "{json}" per line from the app's Documents/
    //    mwp-perf.log (release builds)
    const idx = line.indexOf('[MWPPerf] ');
    const jsonText =
      idx === -1 ? line.trim() : line.slice(idx + '[MWPPerf] '.length);
    if (!jsonText.startsWith('{')) {
      continue;
    }
    try {
      events.push(JSON.parse(jsonText));
    } catch {
      // tolerate wrapped/truncated lines
    }
  }

  const connectEnds = events.filter(
    (evt) => evt.event === 'connect_end' && evt.ok,
  );
  const connectFails = events.filter(
    (evt) => evt.event === 'connect_end' && !evt.ok,
  );
  const resumeEnds = events.filter((evt) => evt.event === 'resume_end');
  const resumeFails = resumeEnds.filter((evt) => !evt.ok);

  // Contention indicator: resume activity starting inside a connect window.
  // Expect > 0 on the control arm (contends) and 0 on the PR arm (defers).
  const connectWindows = [];
  for (const end of connectEnds) {
    const start = events.find(
      (evt) => evt.event === 'connect_start' && evt.id === end.id,
    );
    if (start) {
      connectWindows.push([start.t, end.t]);
    }
  }
  const resumesDuringConnect = events.filter(
    (evt) =>
      evt.event === 'resume_start' &&
      connectWindows.some(([startT, endT]) => evt.t > startT && evt.t < endT),
  ).length;

  const durations = connectEnds.map((evt) => evt.durMs).sort((a, b) => a - b);

  // Approval gate: how long after connect_start the wallet_createSession
  // request became available to the approval flow. ≈ handshake duration when
  // the approval is gated behind the relay (main); ≈ 0 with eager approval
  // (metamask-mobile#32470). Requires trials run with --with-request.
  const approvalGates = [];
  for (const received of events.filter(
    (evt) => evt.event === 'create_session_received',
  )) {
    const start = events.find(
      (evt) => evt.event === 'connect_start' && evt.id === received.id,
    );
    if (start) {
      approvalGates.push(received.t - start.t);
    }
  }
  approvalGates.sort((a, b) => a - b);

  console.log(`\n=== ${file} ===`);
  console.log(
    `connects: ${connectEnds.length} ok, ${connectFails.length} failed`,
  );
  if (durations.length > 0) {
    console.log(
      `connect handshake durMs — median: ${percentile(durations, 50)}  ` +
        `p75: ${percentile(durations, 75)}  min: ${durations[0]}  ` +
        `max: ${durations[durations.length - 1]}  (n=${durations.length})`,
    );
  }
  if (approvalGates.length > 0) {
    console.log(
      `approval gate ms (create_session_received − connect_start) — ` +
        `median: ${percentile(approvalGates, 50)}  ` +
        `max: ${approvalGates[approvalGates.length - 1]}  ` +
        `(n=${approvalGates.length}; ≈handshake when gated, ≈0 when eager)`,
    );
  }
  console.log(
    `resumes: ${resumeEnds.length} total, ${resumeFails.length} failed`,
  );
  console.log(
    `resume_start events inside a connect window: ${resumesDuringConnect} ` +
      `(expect >0 on control, 0 on PR arm)`,
  );
}
