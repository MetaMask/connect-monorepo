/* eslint-disable */
/**
 * Permanent analytics test bench for the browser playground.
 *
 * Drives every classifier branch of `classifyFailureReason` (which decides
 * the `failure_reason` property on `mmconnect_wallet_action_failed` and
 * `mmconnect_connection_failed`) from the dapp side, plus a rejection
 * sanity-check that should produce `mmconnect_wallet_action_rejected`.
 *
 * Pair this with the local analytics echo server (see playground README →
 * "Manually testing analytics events"). The echo server prints the
 * resulting event so you can verify which bucket each trigger lands in.
 *
 * Some buckets aren't deterministically reachable from the dapp
 * (e.g. `transport_disconnect` needs you to kill the wallet mid-flight) —
 * those buttons just show repro instructions instead.
 */
import { useCallback, useMemo, useState } from 'react';
import type { Scope } from '@metamask/connect-multichain';
import { useSDK } from '../sdk';

type ExpectedBucket =
  | 'transport_timeout'
  | 'transport_disconnect'
  | 'wallet_method_unsupported'
  | 'wallet_invalid_params'
  | 'wallet_internal_error'
  | 'wallet_unauthorized'
  | 'wallet_custom_error'
  | 'no_active_session'
  | 'unrecognised_chain'
  | 'unknown';

type ResultEntry = {
  id: number;
  label: string;
  expected: ExpectedBucket | string;
  status: 'pending' | 'threw' | 'no-throw';
  errorName?: string;
  errorMessage?: string;
  errorCode?: number | string;
};

let entryId = 0;
const nextId = () => {
  entryId += 1;
  return entryId;
};

export function AnalyticsTestBench({
  connectedScopes,
}: {
  connectedScopes: Scope[];
}) {
  const { invokeMethod, session } = useSDK();
  const [results, setResults] = useState<ResultEntry[]>([]);

  // Pick the first connected EVM scope; fall back to mainnet so the buttons
  // still render. Each button can override this if it needs a specific scope
  // (e.g. unrecognised_chain wants a chain ID the wallet won't know).
  const defaultScope: Scope =
    (connectedScopes.find((s) => s.startsWith('eip155:')) as Scope) ??
    ('eip155:1' as Scope);

  // Grab the first EVM account from the session for triggers that need a
  // real signer (e.g. `personal_sign`). If we hand the wallet the zero
  // address, it returns -32602 before showing any prompt — which defeats
  // the rejection sanity-check entirely.
  const firstEvmAddress = useMemo<`0x${string}` | undefined>(() => {
    const scopes = session?.sessionScopes ?? {};
    for (const [scope, value] of Object.entries(scopes)) {
      if (!scope.startsWith('eip155:') && scope !== 'wallet') continue;
      const accounts = (value as { accounts?: string[] })?.accounts ?? [];
      for (const caipAccount of accounts) {
        // `eip155:1:0xabc...` → take the trailing address portion
        const addr = caipAccount.split(':').pop();
        if (addr?.startsWith('0x')) return addr as `0x${string}`;
      }
    }
    return undefined;
  }, [session]);

  const runTrigger = useCallback(
    async (
      label: string,
      expected: ExpectedBucket | string,
      trigger: () => Promise<unknown>,
    ) => {
      const id = nextId();
      setResults((prev) => [
        { id, label, expected, status: 'pending' },
        ...prev,
      ]);
      try {
        await trigger();
        setResults((prev) =>
          prev.map((r): ResultEntry =>
            r.id === id ? { ...r, status: 'no-throw' } : r,
          ),
        );
      } catch (error) {
        const e = error as { name?: string; message?: string; code?: unknown };
        const errorPatch: Partial<ResultEntry> = { status: 'threw' };
        if (e.name !== undefined) errorPatch.errorName = e.name;
        if (e.message !== undefined) errorPatch.errorMessage = e.message;
        if (typeof e.code === 'number' || typeof e.code === 'string') {
          errorPatch.errorCode = e.code;
        }
        setResults((prev) =>
          prev.map((r): ResultEntry =>
            r.id === id ? { ...r, ...errorPatch } : r,
          ),
        );
        // Keep console verbose for cross-referencing with the echo server.
        console.warn(`[analytics bench] "${label}":`, error);
      }
    },
    [],
  );

  /* -------------------------------------------------------------------- */
  /* Trigger definitions. Each one targets a specific classifier branch.  */
  /* -------------------------------------------------------------------- */

  const triggerBogusMethod = () =>
    runTrigger(
      'wallet_unauthorized (method not in scope)',
      'wallet_unauthorized',
      () =>
        // Bogus method name — in a CAIP-25 multichain session, the wallet's
        // permission layer rejects this with `4100 Unauthorized` BEFORE any
        // method handler runs (see `wallet-invokeMethod.ts` in @metamask/core).
        // So the practical "method unsupported" signal on multichain is 4100,
        // not -32601.
        invokeMethod({
          scope: defaultScope,
          request: {
            method: 'foo_bar_doesnt_exist',
            params: [],
          },
        }),
    );

  const triggerInvalidParams = () =>
    runTrigger(
      'wallet_invalid_params (−32602)',
      'wallet_invalid_params',
      () =>
        invokeMethod({
          scope: defaultScope,
          request: {
            method: 'eth_sendTransaction',
            params: [
              {
                to: 'not-a-hex-address',
                value: 'not-hex-either',
              } as any,
            ],
          },
        }),
    );

  const triggerSwitchUnknownChain = () =>
    runTrigger(
      'wallet_unauthorized (switchEthereumChain not in scope)',
      'wallet_unauthorized',
      () =>
        // CAIP-25 scopes don't typically include wallet_switchEthereumChain
        // in the granted methods, so this hits the same 4100 path as the
        // bogus method above. To actually reach `4902 unrecognised_chain`
        // (or `-32603 wallet_internal_error`), the wallet would need to grant
        // the method and then run its handler — not generally reachable from
        // the playground.
        invokeMethod({
          scope: defaultScope,
          request: {
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xdeadbe' }],
          },
        }),
    );

  const triggerSwitchFantom = () =>
    runTrigger(
      'wallet_unauthorized (switchEthereumChain not in scope)',
      'wallet_unauthorized',
      () =>
        // Same caveat as above — on a typical multichain session this lands
        // in 4100 unauthorized, not 4902 unrecognised_chain. Kept as a button
        // so we can see if any wallet build behaves differently.
        invokeMethod({
          scope: defaultScope,
          request: {
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xfa' }], // Fantom — usually unknown
          },
        }),
    );

  const triggerSignTypedDataMalformed = () =>
    runTrigger(
      'wallet_invalid_params (malformed signTypedData)',
      'wallet_invalid_params',
      () =>
        // Wallets typically validate the typed-data payload before showing
        // the confirmation UI; bad input produces -32602 or -32603. The
        // exact code varies between builds.
        invokeMethod({
          scope: defaultScope,
          request: {
            method: 'eth_signTypedData_v4',
            params: ['0x0000000000000000000000000000000000000000', '{}'],
          },
        }),
    );

  const triggerNoActiveSession = () =>
    runTrigger(
      'no_active_session (SDK sentinel)',
      'no_active_session',
      () =>
        // Only meaningful if you call it BEFORE connecting. The button is
        // shown unconditionally — if you're connected it will throw a
        // different error and land in `unknown`.
        invokeMethod({
          scope: defaultScope,
          request: {
            method: 'personal_sign',
            params: ['0x68656c6c6f', '0x0000000000000000000000000000000000000000'],
          },
        }),
    );

  const triggerUnknown = () =>
    runTrigger(
      'unknown (fallback) — empty method',
      'unknown',
      () =>
        invokeMethod({
          scope: defaultScope,
          request: {
            method: '',
            params: [],
          },
        }),
    );

  const triggerRejection = () => {
    if (!firstEvmAddress) {
      alert(
        'No EVM account in the current session — connect one first so personal_sign has a real signer to prompt for.',
      );
      return;
    }
    return runTrigger(
      '(rejection — should fire _rejected, NOT _failed)',
      'n/a — _rejected',
      () =>
        // personal_sign params: [message_hex, signer_address]. Must be a real
        // connected account or the wallet rejects with -32602 *before* it
        // ever shows the prompt — which would defeat the sanity-check.
        invokeMethod({
          scope: defaultScope,
          request: {
            method: 'personal_sign',
            params: ['0x68656c6c6f', firstEvmAddress],
          },
        }),
    );
  };

  /* -------------------------------------------------------------------- */
  /* Buttons that need manual repro                                       */
  /* -------------------------------------------------------------------- */
  const triggerTransportTimeout = () => {
    alert(
      [
        'transport_timeout requires a stall longer than the transport timeout.',
        '',
        'Easiest repro:',
        '  1. Open DevTools → Network → set throttling to "Offline".',
        '  2. Click any wallet-bound trigger above (e.g. "wallet_invalid_params").',
        '  3. Wait ~30s for the SDK timeout to fire.',
        '',
        'You should see mmconnect_wallet_action_failed with failure_reason=transport_timeout.',
      ].join('\n'),
    );
  };

  const triggerTransportDisconnect = () => {
    alert(
      [
        'transport_disconnect requires the wallet to drop the connection mid-request.',
        '',
        'Easiest repro:',
        '  1. Click any wallet-bound trigger above.',
        '  2. Immediately disable or quit the MetaMask extension before approving.',
        '',
        'You should see mmconnect_wallet_action_failed with failure_reason=transport_disconnect.',
      ].join('\n'),
    );
  };

  const buttonClass =
    'text-left bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded text-sm transition-colors';
  const manualButtonClass =
    'text-left bg-amber-700 hover:bg-amber-600 text-white px-3 py-2 rounded text-sm transition-colors';

  return (
    <section className="bg-white rounded-lg mb-6 shadow-sm">
      <details className="group">
        <summary className="cursor-pointer list-none p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Analytics test bench
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Drive each <code className="bg-gray-100 px-1 rounded text-xs">failure_reason</code> classifier branch
              from the dapp. Pair with the local analytics echo server (see
              playground README).
            </p>
          </div>
          <span
            aria-hidden
            className="text-gray-400 text-sm select-none group-open:rotate-90 transition-transform"
          >
            ▶
          </span>
        </summary>

        <div className="px-6 pb-6 pt-0">
          <p className="text-sm text-gray-600 mb-2">
            Each button drives a request shape designed to land in a specific{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">failure_reason</code>{' '}
            bucket on{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">
              mmconnect_wallet_action_failed
            </code>
            . Watch the analytics echo server terminal to see the tagged event.
            Connect first — most of these need an active session.
          </p>
          <p className="text-xs text-gray-500 mb-4">
            <strong>Heads up:</strong> on multichain (CAIP-25) sessions, the wallet
            rejects any method not in the granted scope with{' '}
            <code className="bg-gray-100 px-1 rounded">4100 Unauthorized</code>{' '}
            BEFORE the method handler runs. That means buttons like "bogus
            method" and "switch chain to 0xfa" both reach the same code path —
            they all land in{' '}
            <code className="bg-gray-100 px-1 rounded">wallet_unauthorized</code>{' '}
            because the wallet never gets to see the actual method. To reach{' '}
            <code className="bg-gray-100 px-1 rounded">
              wallet_method_unsupported
            </code>{' '}
            (real <code>-32601</code>) or <code>unrecognised_chain</code> (real{' '}
            <code>4902</code>), the method has to be in scope first — that's a
            separate experiment.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              className={buttonClass}
              onClick={triggerBogusMethod}
            >
              wallet_unauthorized (bogus method, blocked by scope)
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={triggerInvalidParams}
            >
              wallet_invalid_params (malformed eth_sendTransaction)
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={triggerSwitchUnknownChain}
            >
              wallet_unauthorized (switch to chain 0xdeadbe)
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={triggerSwitchFantom}
            >
              wallet_unauthorized (switch to 0xfa)
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={triggerSignTypedDataMalformed}
            >
              wallet_invalid_params (signTypedData on bad address)
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={triggerNoActiveSession}
            >
              no_active_session (call before connect)
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={triggerUnknown}
            >
              unknown (empty method name)
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={triggerRejection}
            >
              ↳ rejection sanity-check (reject personal_sign in wallet)
            </button>
            <button
              type="button"
              className={manualButtonClass}
              onClick={triggerTransportTimeout}
            >
              transport_timeout (manual — instructions)
            </button>
            <button
              type="button"
              className={manualButtonClass}
              onClick={triggerTransportDisconnect}
            >
              transport_disconnect (manual — instructions)
            </button>
          </div>

          <div className="text-xs text-gray-500 mb-2">
            <strong>Not currently tracked</strong> (classifier supports the
            buckets but no producer emits them):{' '}
            <code className="bg-gray-100 px-1 rounded">rpc_node_http_error</code>
            ,{' '}
            <code className="bg-gray-100 px-1 rounded">rpc_node_request_error</code>
            ,{' '}
            <code className="bg-gray-100 px-1 rounded">rpc_node_response_error</code>
            . These come from <code>handleWithRpcNode</code> which still throws
            without calling <code>analytics.track</code>.
          </div>

          {results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Recent triggers
              </h3>
              <div className="text-xs font-mono space-y-1">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className={`p-2 rounded border ${
                      r.status === 'threw'
                        ? 'border-red-200 bg-red-50'
                        : r.status === 'no-throw'
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold">{r.label}</span>
                      <span className="text-gray-500">
                        expected: {r.expected}
                      </span>
                    </div>
                    {r.status === 'pending' && (
                      <div className="text-gray-500">…waiting</div>
                    )}
                    {r.status === 'no-throw' && (
                      <div className="text-yellow-800">
                        no error thrown — _failed event will NOT have fired
                      </div>
                    )}
                    {r.status === 'threw' && (
                      <div className="text-gray-700">
                        {r.errorName && (
                          <span className="mr-2">
                            <span className="text-gray-500">name=</span>
                            {r.errorName}
                          </span>
                        )}
                        {r.errorCode !== undefined && (
                          <span className="mr-2">
                            <span className="text-gray-500">code=</span>
                            {String(r.errorCode)}
                          </span>
                        )}
                        {r.errorMessage && (
                          <span>
                            <span className="text-gray-500">msg=</span>
                            {r.errorMessage}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
