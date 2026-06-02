# `@metamask/multichain-ui`

> Connection UI for the MetaMask Connect SDK — install prompt, QR code, and OTP modals.

This package provides the web UI shown during a remote (mobile) connection: the install
modal with the Mobile Wallet Protocol connection QR code / deeplink, and the OTP modal. It
is built with [Stencil](https://stenciljs.com/) and ships the UI as framework-agnostic
**custom elements** (Web Components).

It is consumed internally by [`@metamask/connect-multichain`](../connect-multichain), which
mounts and drives these elements through its `ModalFactory`. Most dapps never import this
package directly — it is pulled in transitively by the connect packages. Import it yourself
only if you are building a custom UI host or registering the elements manually.

## Components

| Custom element       | Purpose                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `<mm-install-modal>` | Prompts the user to install/open MetaMask and renders the connection QR code / deeplink for mobile flows |
| `<mm-otp-modal>`     | Renders the one-time-passcode entry flow used during connection                                          |

`<mm-install-modal>` props: `link` (deeplink/QR payload), `expiresIn`, `showInstallModal`.
It emits `close`, `startDesktopOnboarding`, `updateLink`, and `updateExpiresIn` events.
`<mm-otp-modal>` props: `otpCode`, `displayOTP`; it emits `close`, `disconnect`, and
`updateOTPCode`.

## Installation

```bash
yarn add @metamask/multichain-ui
```

or

```bash
npm install @metamask/multichain-ui
```

## Usage

Because the UI ships as Stencil custom elements, the package's main entry point
(`@metamask/multichain-ui`) exposes **types only** — the `Components`, `JSX`,
`MmInstallModalCustomEvent`, and `MmOtpModalCustomEvent` typings for typed usage in your
own components. The components themselves are consumed as custom elements.

Register the elements with the Stencil lazy-loader from the `./loader` entry, then use the
tags like any other element:

```typescript
import { defineCustomElements } from '@metamask/multichain-ui/loader';

// Registers <mm-install-modal> and <mm-otp-modal> with the browser.
defineCustomElements(window);
```

```html
<mm-install-modal show-install-modal="true"></mm-install-modal>
```

For typed event handling in TypeScript:

```typescript
import type { MmInstallModalCustomEvent } from '@metamask/multichain-ui';

el.addEventListener(
  'close',
  (event: MmInstallModalCustomEvent<{ shouldTerminate?: boolean }>) => {
    // ...
  },
);
```

## Development

```bash
# Dev server with live reload
yarn dev

# Production build (Stencil dist + www output targets)
yarn build
```

The Stencil namespace is `sdk-install-modal-web`. Components render inside Shadow DOM with
styles injected at runtime.

## Content Security Policy

Host pages that render these modals may need to relax their
[CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP):

- `style-src 'unsafe-inline'` — Stencil injects component styles at runtime inside Shadow DOM.
- `img-src data:` — the MetaMask fox is embedded as a `data:` URI inside the generated QR code.

See the [monorepo README](https://github.com/MetaMask/connect-monorepo#readme) for the full
CSP guidance.

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the
[monorepo README](https://github.com/MetaMask/connect-monorepo#readme).

## License

MIT
