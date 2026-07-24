#!/usr/bin/env node
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
  console.error('Usage: node analyze.mjs <log file> [more log files…]');
  process.exit(1);
}

const percentile = (sorted, p) =>
  sorted.length === 0
    ? NaN
    : sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

for (const file of files) {
  const events = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const idx = line.indexOf('[MWPPerf] ');
    if (idx === -1) continue;
    try {
      events.push(JSON.parse(line.slice(idx + '[MWPPerf] '.length)));
    } catch {
      // tolerate wrapped/truncated lines
    }
  }

  const connectEnds = events.filter((e) => e.event === 'connect_end' && e.ok);
  const connectFails = events.filter((e) => e.event === 'connect_end' && !e.ok);
  const resumeEnds = events.filter((e) => e.event === 'resume_end');
  const resumeFails = resumeEnds.filter((e) => !e.ok);

  // Contention indicator: resume activity starting inside a connect window.
  // Expect > 0 on the control arm (contends) and 0 on the PR arm (defers).
  const connectWindows = [];
  for (const end of connectEnds) {
    const start = events.find(
      (e) => e.event === 'connect_start' && e.id === end.id,
    );
    if (start) connectWindows.push([start.t, end.t]);
  }
  const resumesDuringConnect = events.filter(
    (e) =>
      e.event === 'resume_start' &&
      connectWindows.some(([s, t]) => e.t > s && e.t < t),
  ).length;

  const durations = connectEnds.map((e) => e.durMs).sort((a, b) => a - b);

  console.log(`\n=== ${file} ===`);
  console.log(`connects: ${connectEnds.length} ok, ${connectFails.length} failed`);
  if (durations.length > 0) {
    console.log(
      `connect handshake durMs — median: ${percentile(durations, 50)}  ` +
        `p75: ${percentile(durations, 75)}  min: ${durations[0]}  ` +
        `max: ${durations[durations.length - 1]}  (n=${durations.length})`,
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
