# MetaMask Connect — Content Security Policy (browser)

The canonical reference for CSP origins the SDK needs in the browser. Not relevant in Node.js or React Native. For always-on core guardrails see [conventions.md](conventions.md).

A host page with a strict CSP must allow MetaMask Connect's origins, or browser integrations fail in ways that look like other bugs — a blocked relay socket presents exactly like "connection hangs".

**Required:**

- `connect-src wss://mm-sdk-relay.api.cx.metamask.io` — the relay WebSocket used for remote (mobile / no-extension) connections. It cannot be proxied or deferred from within the library, so remote connections fail without it.
- `img-src data:` — the install/QR modal in `@metamask/multichain-ui` embeds the MetaMask fox as a `data:` URI inside the generated QR code (it sets `saveAsBlob: false`), so the QR will not render without it.

**Also consider:**

- `connect-src https://mm-sdk-analytics.api.cx.metamask.io` — the `@metamask/analytics` telemetry endpoint, used when analytics are enabled (the default). Unnecessary if you set `analytics: { enabled: false }`.
- `style-src 'unsafe-inline'` — `@metamask/multichain-ui` is built with Stencil, which injects component styles at runtime into Shadow DOM. Strict CSPs without `'unsafe-inline'` (or an equivalent nonce/hash strategy) may break modal styling.
- RPC endpoints you pass to `supportedNetworks` (e.g. `https://*.infura.io` or your own node provider) — add the matching `connect-src` entries for whatever you configure.
- `https://metamask.app.link` and `metamask://` — mobile deeplinks / universal links. These are top-level navigations and not normally subject to `connect-src`, but strict policies using `navigate-to` / `form-action` may need to allow them.

Minimal example (default analytics endpoint + Infura + install modal):

```
connect-src 'self' wss://mm-sdk-relay.api.cx.metamask.io https://mm-sdk-analytics.api.cx.metamask.io https://*.infura.io;
img-src 'self' data:;
style-src 'self' 'unsafe-inline';
```
