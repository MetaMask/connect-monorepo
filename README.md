# MetaMask Connect Monorepo

This is a template for creating new monorepos under the MetaMask GitHub organization. (Replace this description with your own.)

> [!note]
>
> ## Template Instructions
>
> To use this template, follow these steps:
>
> 1. Click on the "Use this template" button in the top-left corner of the repo, then select "Create a new repository". Follow the instructions to make a new repo.
> 2. Once the new repo is created, run `yarn install`.
> 3. Remove all subdirectories in `packages/`.
> 4. Re-run `yarn update-readme-content`.
> 5. Open `tsconfig.json` and reset `references` to an empty array.
> 6. Open `tsconfig.build.json` and reset `references` to an empty array.
> 7. Open `docs/contributing.md` and replace `metamask-monorepo-template` with the name of your repo.
> 8. Update the title and description at the top of this README to match your repo.
> 9. Update `.github/CODEOWNERS` to match your team.
> 10. Open `scripts/create-package/package-template/README.md` and replace `THIS_REPO` with the name of your repo.
> 11. Delete this "Template Instructions" section.
> 12. [Add a new package using the `create-package` tool.](./docs/contributing.md#adding-new-packages-to-the-monorepo)

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
- [`@metamask/connect`](packages/connect)
- [`@metamask/connect-multichain`](packages/connect-multichain)
- [`@metamask/connect-multichain-node-playground`](playground/multichain-node-playground)
- [`@metamask/connect-multichain-react-playground`](playground/multichain-react-playground)
- [`@metamask/connect-multichain-react-native-playground`](packages/multichain-react-native-playground)
- [`@metamask/multichain-ui`](packages/multichain-ui)

<!-- end package list -->

<!-- start dependency graph -->

```mermaid
%%{ init: { 'flowchart': { 'curve': 'bumpX' } } }%%
graph LR;
linkStyle default opacity:0.5
  analytics(["@metamask/analytics"]);
  connect(["@metamask/connect"]);
  connect_multichain(["@metamask/connect-multichain"]);
  multichain_react_native_playground(["@metamask/connect-multichain-react-native-playground"]);
  multichain_ui(["@metamask/multichain-ui"]);
  multichain_react_playground(["@metamask/connect-multichain-react-playground"]);
  multichain_node_playground(["@metamask/connect-multichain-node-playground"]);
  connect_multichain --> analytics;
  connect_multichain --> multichain_ui;
  multichain_react_playground --> connect_multichain;
```

<!-- end dependency graph -->

(This section may be regenerated at any time by running `yarn update-readme-content`.)
