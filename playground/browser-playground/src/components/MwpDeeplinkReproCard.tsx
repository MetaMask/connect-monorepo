/**
 * MwpDeeplinkReproCard
 *
 * A QA-focused debug panel that surfaces a curated set of MWP (Mobile Wallet
 * Protocol) deeplinks designed to exercise both the happy path and every known
 * failure path inside the mobile app's `ConnectionRegistry.handleConnectDeeplink`
 * (`metamask-mobile/app/core/SDKConnectV2/services/connection-registry.ts`).
 *
 * Goals:
 * 1. Give QA / SDETs a reproducible way to trigger each failure branch without
 *    needing a real dapp that happens to be misconfigured in just the right way.
 * 2. Provide a target surface for verifying Sentry coverage of those failure
 *    branches (see MetaMask/metamask-mobile PR #30343).
 *
 * Each row renders:
 *   - A human-readable label and the failure branch it targets
 *   - The literal deeplink URL (so it can be copied)
 *   - A "Tap on mobile" anchor (only useful on a mobile browser, since
 *     `metamask://` URLs only resolve when the OS has MetaMask installed)
 *
 * NOTE: This panel is for QA only. It is collapsed by default and gated behind
 * an explicit toggle so it does not clutter the default playground UX.
 */

import { useMemo, useState } from 'react';

type ReproRow = {
  id: string;
  label: string;
  expectedFailure: string;
  buildUrl: () => string;
};

const VALID_REQUEST = {
  sessionRequest: {
    id: '11111111-2222-3333-4444-555555555555',
    publicKeyB64: 'AoBDLWxRbJNe8yUv5bmmoVnNo8DCilzbFz/nWD+RKC2V',
    channel: 'handshake:aabbccdd-1122-3344-5566-778899aabbcc',
    mode: 'trusted',
    // `expiresAt` is intentionally far in the future so the request itself is
    // not the reason a downstream check fails.
    expiresAt: Date.now() + 1000 * 60 * 60,
  },
  metadata: {
    dapp: {
      name: 'MMC Playground (QA Repro)',
      url: 'https://playground.metamask.io',
    },
    sdk: {
      version: '0.0.0-qa-repro',
      platform: 'JavaScript',
    },
  },
};

const encode = (obj: unknown) => encodeURIComponent(JSON.stringify(obj));

const ROWS: ReproRow[] = [
  {
    id: 'control-happy-path',
    label: 'Control: well-formed connect deeplink',
    expectedFailure:
      'No failure — the mobile app should reach Connection.create and then fail at the relay handshake (which is the only step we cannot fake from a dapp). Useful as a baseline.',
    buildUrl: () =>
      `metamask://connect/mwp?p=${encode(VALID_REQUEST)}`,
  },
  {
    id: 'no-payload',
    label: 'No payload param',
    expectedFailure: 'parseConnectionRequest throws "No payload found in URL."',
    buildUrl: () => 'metamask://connect/mwp',
  },
  {
    id: 'malformed-json',
    label: 'Payload is not valid JSON',
    expectedFailure:
      'JSON.parse inside parseConnectionRequest throws SyntaxError.',
    buildUrl: () => 'metamask://connect/mwp?p=not-json',
  },
  {
    id: 'invalid-shape',
    label: 'Payload parses as JSON but is not a ConnectionRequest',
    expectedFailure:
      'isConnectionRequest() returns false → "Invalid connection request structure."',
    buildUrl: () => `metamask://connect/mwp?p=${encode({ hello: 'world' })}`,
  },
  {
    id: 'invalid-uuid',
    label: 'sessionRequest.id is not a UUID',
    expectedFailure:
      'isConnectionRequest() rejects the non-UUID id → "Invalid connection request structure."',
    buildUrl: () =>
      `metamask://connect/mwp?p=${encode({
        ...VALID_REQUEST,
        sessionRequest: {
          ...VALID_REQUEST.sessionRequest,
          id: 'not-a-uuid',
        },
      })}`,
  },
  {
    id: 'internal-origin-dapp-url',
    label: 'dapp.url claims to be an internal origin',
    expectedFailure:
      'INTERNAL_ORIGINS check throws "External transactions cannot use internal origins". (In practice isConnectionRequest already rejects non-https dapp.url values, so this hits the upstream guard first.)',
    buildUrl: () =>
      `metamask://connect/mwp?p=${encode({
        ...VALID_REQUEST,
        metadata: {
          ...VALID_REQUEST.metadata,
          dapp: { ...VALID_REQUEST.metadata.dapp, url: 'metamask' },
        },
      })}`,
  },
  {
    id: 'compression-flag-mismatch',
    label: 'c=1 (compressed) flag set, but payload is plain JSON',
    expectedFailure:
      'decompressPayloadB64 throws while trying to inflate non-deflated bytes.',
    buildUrl: () =>
      `metamask://connect/mwp?p=${encode(VALID_REQUEST)}&c=1`,
  },
  {
    id: 'payload-too-large',
    label: 'Payload over 1MB',
    expectedFailure: 'parseConnectionRequest throws "Payload too large (max 1MB)."',
    buildUrl: () => {
      // 1MB + 1 byte after URL encoding. Repeating "a" stays the same length
      // when URI-encoded, so length === byte count for the `p` value.
      const oneMbPlusOne = 'a'.repeat(1024 * 1024 + 1);
      return `metamask://connect/mwp?p=${oneMbPlusOne}`;
    },
  },
];

export function MwpDeeplinkReproCard() {
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => ROWS, []);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-sm text-gray-500 underline hover:text-gray-700"
      >
        Show QA: MWP deeplink failure repros
      </button>
    );
  }

  return (
    <section className="bg-white rounded-lg p-8 mb-6 shadow-sm border border-dashed border-gray-300">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            QA: MWP deeplink failure repros
          </h2>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Each row below produces a <code>metamask://connect/mwp?…</code>{' '}
            deeplink that targets a specific branch inside the mobile app&apos;s{' '}
            <code>ConnectionRegistry.handleConnectDeeplink</code> error
            handling. Open this page on a mobile device with MetaMask Mobile
            installed and tap a row to exercise that branch. Each failure
            should produce both a <code>REMOTE_CONNECTION_REQUEST_FAILED</code>{' '}
            MetaMetrics event and a Sentry event tagged{' '}
            <code>feature: mm-connect</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-gray-400 hover:text-gray-600 ml-4"
        >
          Hide
        </button>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const url = (() => {
            try {
              return row.buildUrl();
            } catch (e) {
              return `<failed to build URL: ${
                e instanceof Error ? e.message : String(e)
              }>`;
            }
          })();
          return (
            <div
              key={row.id}
              className="border border-gray-200 rounded p-4"
              data-testid={`mwp-repro-${row.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{row.label}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {row.expectedFailure}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <a
                    href={url}
                    className="text-center bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    Tap on mobile
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(url).catch(() => {
                        /* clipboard unavailable; ignore */
                      });
                    }}
                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300 transition-colors"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
              <p className="font-mono text-[11px] text-gray-500 mt-3 break-all">
                {url.length > 200 ? `${url.slice(0, 200)}… (${url.length} chars)` : url}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
