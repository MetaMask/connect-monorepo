/**
 * Shared helpers for the MWP connect benchmark harness.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { PrivateKey } from 'eciesjs';

/**
 * Builds a synthetic, valid trusted-mode MWP connect deeplink.
 *
 * The peer key must be a REAL secp256k1 point — the wallet client validates
 * it (validatePeerKey) and rejects random bytes.
 *
 * No `initialMessage` is included (QR-style flow), so the wallet performs the
 * full relay handshake and persists the session WITHOUT showing an approval —
 * ideal for both seeding background sessions and firing measurement trials.
 *
 * Passes every check in MetaMask Mobile's isConnectionRequest() validator
 * (app/core/SDKConnectV2/types/connection-request.ts).
 *
 * @param {string} label - Human-readable dapp name for the session.
 * @returns {{ id: string, url: string }} Session id and deeplink URL.
 */
export const buildConnectUrl = (label) => {
  const id = randomUUID();
  const publicKeyB64 = Buffer.from(
    new PrivateKey().publicKey.toBytes(true), // 33-byte compressed point
  ).toString('base64');

  const connectionRequest = {
    sessionRequest: {
      id,
      mode: 'trusted',
      channel: `handshake:${id}`,
      publicKeyB64,
      expiresAt: Date.now() + 10 * 60 * 1000,
    },
    metadata: {
      dapp: {
        name: label,
        url: `https://${label.toLowerCase().replace(/[^a-z0-9]+/gu, '-')}.example.com`,
      },
      sdk: { version: '0.0.0-bench', platform: 'JavaScript' },
    },
  };

  const p = encodeURIComponent(JSON.stringify(connectionRequest));
  return { id, url: `metamask://connect/mwp?p=${p}` };
};

/**
 * Opens a URL in the simulator MetaMask via the `mmdl` CLI
 * (https://github.com/MetaMask — internal tool; any equivalent of
 * `xcrun simctl openurl booted <url>` with optional pre-terminate works).
 *
 * @param {string} url - The deeplink to open.
 * @param {{ terminateFirst?: boolean }} [options] - Terminate the app first
 * so the launch is a true cold start.
 */
export const openDeeplink = (url, { terminateFirst = false } = {}) => {
  const args = terminateFirst ? ['-t', url] : [url];
  execFileSync('mmdl', args, { stdio: 'inherit' });
};

/**
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise<void>} Resolves after the delay.
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
