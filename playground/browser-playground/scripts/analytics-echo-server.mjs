/**
 * Local analytics echo server for the browser playground.
 *
 * Stands in for `https://mm-sdk-analytics.api.cx.metamask.io` when you want
 * to manually inspect the analytics events the playground produces. Accepts
 * `POST /v2/events` from `@metamask/analytics`, pretty-prints each event
 * with `event_name`, `failure_reason`, `method`, and `transport` highlighted,
 * and replies `200 {}` so the SDK's Sender batch loop is happy.
 *
 * See `playground/browser-playground/README.md` → "Manually testing
 * analytics events" for the full setup.
 *
 * Usage:
 *   yarn analytics:echo                 # listens on :8787
 *   PORT=9090 yarn analytics:echo       # custom port
 *   node scripts/analytics-echo-server.mjs   # standalone, no yarn
 */

import http from 'node:http';

// eslint-disable-next-line n/no-process-env -- standalone CLI script: PORT env var is the documented way to override the default.
const PORT = Number(process.env.PORT ?? 8787);

const COLOR = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

const colorForEvent = (name) => {
  if (!name) {
    return COLOR.dim;
  }
  if (name.endsWith('_failed')) {
    return COLOR.red;
  }
  if (name.endsWith('_rejected')) {
    return COLOR.yellow;
  }
  if (name.endsWith('_succeeded') || name === 'mmconnect_connected') {
    return COLOR.green;
  }
  if (name.endsWith('_requested')) {
    return COLOR.cyan;
  }
  return COLOR.magenta;
};

let eventCounter = 0;

const printEvent = (event) => {
  eventCounter += 1;
  const name = event?.event_name ?? '<no event_name>';
  const props = event?.properties ?? {};
  const failureReason = props.failure_reason;
  const { method } = props;
  const transport = props.transport_type;

  const head =
    `${COLOR.dim}#${eventCounter}${COLOR.reset}  ` +
    `${colorForEvent(name)}${COLOR.bold}${name}${COLOR.reset}`;

  const tags = [];
  if (failureReason) {
    tags.push(
      `${COLOR.bold}${COLOR.red}failure_reason=${failureReason}${COLOR.reset}`,
    );
  }
  if (method) {
    tags.push(`${COLOR.cyan}method=${method}${COLOR.reset}`);
  }
  if (transport) {
    tags.push(`${COLOR.blue}transport=${transport}${COLOR.reset}`);
  }

  console.log(`\n${head}${tags.length ? `  ${tags.join('  ')}` : ''}`);
  console.log(`${COLOR.dim}${JSON.stringify(props, null, 2)}${COLOR.reset}`);
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
    res.end('not found');
    return;
  }

  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error(
        `\n${COLOR.red}Failed to parse body${COLOR.reset}`,
        parseError,
      );
      console.error(raw);
      res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
      res.end('{}');
      return;
    }

    const events = Array.isArray(parsed) ? parsed : [parsed];
    console.log(
      `\n${COLOR.dim}━━━ ${new Date().toISOString()}  POST ${req.url}  (${events.length} event${events.length === 1 ? '' : 's'}) ━━━${COLOR.reset}`,
    );
    for (const ev of events) {
      printEvent(ev);
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end('{}');
  });
});

server.listen(PORT, () => {
  console.log(
    `${COLOR.bold}${COLOR.green}analytics echo server listening on http://localhost:${PORT}${COLOR.reset}`,
  );
  console.log(
    `${COLOR.dim}  expecting POST /v2/events from @metamask/analytics${COLOR.reset}`,
  );
  console.log(
    `${COLOR.dim}  start playground with: METAMASK_ANALYTICS_ENDPOINT=http://localhost:${PORT}/ yarn start${COLOR.reset}\n`,
  );
});
