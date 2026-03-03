# MetaMask Connect Monorepo

This monorepo is a collection of packages used for MetaMask Connect, a unified connection experience that aims towards delivering multichain functionality, persistent sessions, and abstracted transactions while preserving backwards compatibility with MetaMask SDK.

## Contributing

See the [Contributor Guide](./docs/contributing.md) for help on:

- Setting up your development environment
- Working with the monorepo
- Testing changes a package in other projects
- Issuing new releases
- Creating a new package

## Packages

<!-- start package list -->

- [`@metamask/analytics`](packages/analytics)
- [`@metamask/browser-playground`](playground/browser-playground)
- [`@metamask/connect`](packages/connect)
- [`@metamask/connect-evm`](packages/connect-evm)
- [`@metamask/connect-multichain`](packages/connect-multichain)
- [`@metamask/connect-solana`](packages/connect-solana)
- [`@metamask/multichain-ui`](packages/multichain-ui)
- [`@metamask/node-playground`](playground/node-playground)
- [`@metamask/playground-ui`](playground/playground-ui)
- [`@metamask/react-native-playground`](playground/react-native-playground)

<!-- end package list -->

<!-- start dependency graph -->

```mermaid
%%{ init: { 'flowchart': { 'curve': 'bumpX' } } }%%
graph LR;
linkStyle default opacity:0.5
  analytics(["@metamask/analytics"]);
  connect(["@metamask/connect"]);
  connect_evm(["@metamask/connect-evm"]);
  connect_multichain(["@metamask/connect-multichain"]);
  connect_solana(["@metamask/connect-solana"]);
  multichain_ui(["@metamask/multichain-ui"]);
  browser_playground(["@metamask/browser-playground"]);
  node_playground(["@metamask/node-playground"]);
  playground_ui(["@metamask/playground-ui"]);
  react_native_playground(["@metamask/react-native-playground"]);
  connect --> connect_evm;
  connect --> connect_multichain;
  connect_evm --> analytics;
  connect_evm --> connect_multichain;
  connect_multichain --> analytics;
  connect_multichain --> multichain_ui;
  connect_solana --> connect_multichain;
  browser_playground --> connect_evm;
  browser_playground --> connect_multichain;
  browser_playground --> playground_ui;
  node_playground --> connect_evm;
  node_playground --> connect_multichain;
  node_playground --> connect_solana;
  react_native_playground --> connect_evm;
  react_native_playground --> connect_multichain;
  react_native_playground --> playground_ui;
```

<!-- end dependency graph -->

(This section may be regenerated at any time by running `yarn update-readme-content`.)
