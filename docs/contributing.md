# Contributor Guide

## Table of contents

- [Setting up your development environment](#setting-up-your-development-environment)
- [Understanding code guidelines](#understanding-code-guidelines)
- [Writing and running tests](#writing-and-running-tests)
- [Linting](#linting)
- [Building](#building)
- [Updating changelogs](#updating-changelogs)
- [Creating pull requests](#creating-pull-requests)
- [Testing changes to packages in another project](#testing-changes-to-packages-in-another-project)
- [Releasing changes](#releasing-changes)
- [Performing operations across the monorepo](#performing-operations-across-the-monorepo)
- [Adding new packages to the monorepo](#adding-new-packages-to-the-monorepo)

## Setting up your development environment

1. Install the current LTS version of [Node](https://nodejs.org).
   - If you are using [NVM](https://github.com/creationix/nvm#installation) (recommended), running `nvm install` will install the latest version, and running `nvm use` will automatically choose the right Node version for you.
2. Run `corepack enable` to install [Yarn](https://yarnpkg.com) via [Corepack](https://github.com/nodejs/corepack?tab=readme-ov-file#how-to-install).
   - If you have Yarn installed globally via Homebrew or NPM, you'll need to uninstall it before running this command.
3. Run `yarn install` to install dependencies and run any required post-install scripts.
4. Run `yarn simple-git-hooks` to add a [Git hook](https://github.com/toplenboren/simple-git-hooks#what-is-a-git-hook) to your local development environment which will ensure that all files pass linting before you push a branch.

## Understanding code guidelines

All code in this repo should not only follow the [MetaMask contributor guidelines](https://github.com/MetaMask/contributor-docs) but also the guidelines contained in this repo:

- [Package guidelines](./package-guidelines.md)
- [Controller guidelines](./controller-guidelines.md)

## Writing and running tests

[Vitest](https://vitest.dev/) is used to ensure that code is working as expected. Ideally, all packages should have 100% test coverage.

Please follow the [MetaMask unit testing guidelines](https://github.com/MetaMask/contributor-docs/blob/main/docs/testing/unit-testing.md) when writing tests.

If you need to customize the behavior of Vitest for a package, see `vitest.config.ts` within that package.

- Run `yarn workspace <workspaceName> run test` to run all tests for a package.
- Run `yarn workspace <workspaceName> run vitest <file>` to run a test file within the context of a package.
- Run `yarn test` to run tests for all packages.

> **Note**
>
> `workspaceName` in these commands is the `name` field within a package's `package.json`, e.g., `@metamask/address-book-controller`, not the directory where it is located, e.g., `packages/address-book-controller`.

## Linting

[ESLint](https://eslint.org) v9 (via [MetaMask's shared ESLint configurations](https://github.com/MetaMask/eslint-config)) is used to check for code quality issues, and [Prettier](https://prettier.io/docs/en/) is used to format files.

If you need to customize the behavior of ESLint, see `eslint.config.mjs` in the root.

- Run `yarn lint` to lint all files and show possible violations across the monorepo.
- Run `yarn lint:fix` to fix any automatically fixable violations.

## Building

[`ts-bridge`](https://github.com/ts-bridge/ts-bridge) is used to publish packages in both CommonJS- and ESM-compatible formats.

Built files show up in the `dist/` directory in each package. These are the files which will ultimately be published to NPM.

- Run `yarn build` to build all packages in the monorepo.
- Run `yarn workspace <workspaceName> run build` to build a single package.

## Updating changelogs

Each package in this repo has a file called `CHANGELOG.md` which is used to record consumer-facing changes that have been published over time. This file is useful for other engineers who are upgrading to new versions of packages so that they know how to use new features they are expecting, they know when bugs have been addressed, and they understand how to adapt to breaking changes (if any). All changelogs follow the ["Keep a Changelog"](https://keepachangelog.com/) specification (enforced by `@metamask/auto-changelog`).

As you make changes to packages, make sure to update their changelogs in the same branch.

We will offer more guidance here in the future, but in general:

- Place new entries under the "Unreleased" section.
- Place changes into categories. Consult the ["Keep a Changelog"](https://keepachangelog.com/en/1.1.0/#how) specification for the list.
- Highlight breaking changes by prefixing them with `**BREAKING:**`.
- Omit non-consumer facing changes from the changelog.
- Do not simply reuse the commit message, but describe exact changes to the API or usable surface area of the project.
- Use a list nested under a changelog entry to enumerate more details about a change if need be.
- Include links to pull request(s) that introduced each change. (Most likely, this is the very same pull request in which you are updating the changelog.)
- Combine like changes from multiple pull requests into a single changelog entry if necessary.
- Split disparate changes from the same pull request into multiple entries if necessary.
- Omit reverted changes from the changelog.

## Creating pull requests

When submitting a pull request for this repo, take some a bit of extra time to fill out its description. Use the provided template as a guide, paying particular attention to the **Explanation** section. This section is intended for you to explain the purpose and scope of your changes and share knowledge that other engineers might not be able to see from reading the PR alone. Some questions you should seek to answer are:

- What is the motivator for these changes? What need are the changes satisfying? Is there a ticket you can share or can you provide some more context for people who might not be familiar with the domain?
- Are there any changes in particular whose purpose might not be obvious or whose implementation might be difficult to decipher? How do they work?
- If your primary goal was to update one package but you found you had to update another one along the way, why did you do so?
- If you had to upgrade a dependency, why did you do so?

## Testing changes to packages in another project

If you have a project that depends on a package in this monorepo, you may want to load those changes into the project without having to create a whole new monorepo release. How you do this depends on your use case.

### Testing changes to packages locally

If you're developing your project locally and want to test changes to a package, you can follow these steps:

1. First, you must build the monorepo, by running `yarn build`.
2. Next, you need to connect the package to your project by overriding the resolution logic in your package manager to replace the published version of the package with the local version.
   1. Open `package.json` in the project and locate the dependency entry for the package.
   2. Locate the section responsible for resolution overrides (or create it if it doesn't exist). If you're using Yarn, this is `resolutions`; if you're using NPM or any other package manager, this is `overrides`.
   3. Add a line to this section that mirrors the dependency entry on the left-hand side and points to the local path on the right-hand side:

      ```
      "@metamask/<PACKAGE_NAME>@<PUBLISHED_VERSION_RANGE>": "file:<PATH_TO_CORE>/packages/<PACKAGE_NAME>"
      ```

      > **Example:**
      >
      > - If your project uses Yarn, `@metamask/wallet-utils` is listed in dependencies at `^1.1.4`, and your clone of this repo (`connect-monorepo`) is at the same level as your project, add the following to `resolutions`:
      >
      >   ```
      >   "@metamask/wallet-utils@^1.1.4": "file:../connect-monorepo/packages/controller-utils"
      >   ```

   4. Run `yarn install`.

3. Due to the use of Yarn's `file:` protocol, if you update the package in the monorepo, then you'll need to run `yarn install` in the project again.

### Testing changes to packages with preview builds

If you want to test changes to a package where it would be unwieldy or impossible to use a local version, such as on CI, you can publish a preview build and configure your project to use it.

#### Publishing preview builds as a MetaMask contributor

If you're a member of the MetaMask organization, you can create preview builds based on a pull request by following these steps:

1. Post a comment on the pull request with the text `@metamaskbot publish-preview`. This starts the `publish-preview` GitHub action, which will create preview builds for all packages in the monorepo.
2. After a few minutes, the action should complete and you will see a new comment that lists the newly published packages along with their versions.

   Note two things about each package:
   - The name is scoped to `@metamask-previews` instead of `@metamask`.
   - The ID of the last commit in the branch is appended to the version, e.g. `1.2.3-preview-e2df9b4` instead of `1.2.3`.

Now you can [use these preview builds in your project](#using-preview-builds).

If you make more changes to a package, follow step 2 again, making sure to update the reference to the package in your project's `package.json` to use the newly published preview version.

#### Publishing preview builds as an independent contributor

If you've forked this repository, you can create preview builds based on a branch by following these steps:

1. First, since an NPM scope is used to host preview build releases, you'll need access to one. If you do not, you can either [create a new organization](https://www.npmjs.com/org/create) or [convert your existing username into an organization](https://www.npmjs.com/org/upgrade).

2. Once you've done this, open the `package.json` for each package that you want to publish and change the scope in the name from `@metamask` to `@<NPM_ORG>`, replacing `NPM_ORG` with your NPM organization.

3. Next, run the following command to create and publish the preview builds (again, replacing `NPM_ORG` as appropriate):

   ```
   yarn prepare-preview-builds "@<NPM_ORG>" "$(git rev-parse --short HEAD)" && yarn build && yarn publish-previews
   ```

   You should be able to see the published version of each package in the output. Note two things:
   - The name is scoped to the NPM organization you entered instead of `@metamask`.
   - The ID of the last commit in the branch is appended to the version, e.g. `1.2.3-preview-e2df9b4` instead of `1.2.3`.

Now you can [use these preview builds in your project](#using-preview-builds).

If you make more changes to a package, follow step 3 again, making sure to update the reference to the package in your project's `package.json` to use the newly published preview version.

#### Using preview builds

To use a preview build for a package within a project, you need to override the resolution logic for your package manager so that the "production" version of that package is replaced with the preview version. Here's how you do that:

1. Open `package.json` in the project and locate the dependency entry for the package for which you want to use a preview build.
2. Locate the section responsible for resolution overrides (or create it if it doesn't exist). If you're using Yarn, this is `resolutions`; if you're using NPM or any other package manager, this is `overrides`.
3. Add a line to this section that mirrors the dependency entry on the left-hand side and points to the preview version on the right-hand side:

   ```
   "@metamask/<PACKAGE_NAME>@<PRODUCTION_VERSION_RANGE>": "npm:@<NPM_ORG>/<PACKAGE_NAME>@<PREVIEW_VERSION>"
   ```

   > **Example:**
   >
   > - If your project uses Yarn, `@metamask/wallet-utils` is listed in dependencies at `^1.1.4`, and you want to use the preview version `1.2.3-preview-e2df9b4`, add the following to `resolutions`:
   >
   >   ```
   >   "@metamask/wallet-utils@^1.1.4": "npm:@metamask-previews/wallet-utils@1.2.3-preview-e2df9b4"
   >   ```

4. Run `yarn install`.

## Releasing changes

Use the following process to release new packages in this repo:

1. **Start the release tool.**

   On the `main` branch, run:

   ```
   yarn prepare-release
   ```

   This command runs the interactive release tool and automatically bumps playground versions afterward (steps 1-5 below). Alternatively, you can run the steps separately:

   ```
   yarn create-release-branch -i   # Interactive release tool
   yarn bump-playground-versions   # Bump playground versions (after step 4)
   ```

   The interactive tool will start a local web server (default port 3000) and open a browser interface.

   > **Tip:**
   > You can specify a different port if needed: `yarn create-release-branch -i -p 3001`

2. **Select packages to release.**

   The UI will show all packages with changes since their last release. For each package:
   - Choose whether to include it in the release
   - Select an appropriate version bump (patch, minor, or major) following SemVer rules
   - The UI will automatically validate your selections and identify dependencies that need to be included

3. **Review and resolve dependency requirements.**

   The UI automatically analyzes your selections and identifies potential dependency issues that need to be addressed before proceeding. You'll need to review and resolve these issues by either:
   - Including the suggested additional packages
   - Confirming that you want to skip certain packages (if you're certain they don't need to be updated)

   Common types of dependency issues you might encounter:
   - **Missing dependencies**: If you're releasing Package A that depends on Package B, the UI will prompt you to include Package B
   - **Breaking change impacts**: If you're releasing Package B with breaking changes, the UI will identify packages that have peer dependencies on Package B that need to be updated
   - **Version incompatibilities**: The UI will flag if your selected version bumps don't follow semantic versioning rules relative to dependent packages

   Unlike the manual workflow where you need to repeatedly edit a YAML file, in the interactive mode you can quickly resolve these issues by checking boxes and selecting version bumps directly in the UI.

4. **Confirm your selections.**

   Once you're satisfied with your package selections and version bumps, confirm them in the UI. This will:
   - Create a new branch named `release/<new release version>`
   - Update the version in each package's `package.json`
   - Add a new section to each package's `CHANGELOG.md` for the new version

5. **Bump playground versions.**

   > **Note:** If you used `yarn prepare-release` in step 1, this step was already performed automatically.

   After the release branch is created, run:

   ```
   yarn bump-playground-versions
   ```

   This script automatically detects which core packages are being released and bumps the patch version of any playground packages that depend on them. It will:

   - Identify packages in `packages/` that have version bumps without corresponding git tags
   - Find playground packages (`browser-playground`, `react-native-playground`) that depend on those packages
   - Bump their patch versions and update their changelogs
     - NOTE: It's possible that a playground has unreleased changes that depend on packages other than the packages being bumped! If this is the case, undo the changes by this tool related to the release of affected playground(s)
   

   Review the changes made by this script before proceeding.

6. **Review and update changelogs.**

   Each selected package will have a new changelog section. Review these entries to ensure they are helpful for consumers:
   - Categorize entries appropriately following the ["Keep a Changelog"](https://keepachangelog.com/en/1.0.0/) guidelines. Ensure that no changes are listed under "Uncategorized".
   - Remove changelog entries that don't affect consumers of the package (e.g. lockfile changes or development environment changes). Exceptions may be made for changes that might be of interest despite not having an effect upon the published package (e.g. major test improvements, security improvements, improved documentation, etc.).
   - Reword changelog entries to explain changes in terms that users of the package will understand (e.g., avoid referencing internal variables/concepts).
   - Consolidate related changes into single entries where appropriate.

   Run `yarn changelog:validate` when you're done to ensure all changelogs are correctly formatted.

7. **Push and submit a pull request.**

   Create a PR for the release branch so that it can be reviewed and tested.

8. **Incorporate any new changes from `main`.**

   If you see the "Update branch" button on your release PR, stop and look over the most recent commits made to `main`. If there are new changes to packages you are releasing, make sure they are reflected in the appropriate changelogs.

9. **Merge the release PR and wait for approval.**

   "Squash & Merge" the release PR when it's approved.

   Merging triggers the [`publish-release` GitHub action](https://github.com/MetaMask/action-publish-release) workflow to tag the final release commit and publish the release on GitHub. Before packages are published to NPM, this action will automatically notify the [`npm-publishers`](https://github.com/orgs/MetaMask/teams/npm-publishers) team in Slack to review and approve the release.

10. **Verify publication.**

    Once the `npm-publishers` team has approved the release, you can click on the link in the Slack message to monitor the remainder of the process.

    After the action has completed, [check NPM](https://npms.io/search?q=scope%3Ametamask) to verify that all relevant packages have been published.

## Performing operations across the monorepo

This repository relies on Yarn's [workspaces feature](https://yarnpkg.com/features/workspaces) to provide a way to work with packages individually and collectively. Refer to the documentation for the following Yarn commands for usage instructions:

- [`yarn workspace`](https://yarnpkg.com/cli/workspace)
- [`yarn workspaces foreach`](https://yarnpkg.com/cli/workspaces/foreach)

> **Note**
>
> - `workspaceName` in the Yarn documentation is the `name` field within a package's `package.json`, e.g., `@metamask/address-book-controller`, not the directory where it is located, e.g., `packages/address-book-controller`.
> - `commandName` in the Yarn documentation is any sub-command that the `yarn` executable would usually take. Pay special attention to the difference between `run` vs `exec`. If you want to run a package script, you would use `run`, e.g., `yarn workspace @metamask/address-book-controller run changelog:validate`; but if you want to run _any_ shell command, you'd use `exec`, e.g. `yarn workspace @metamask/address-book-controller exec cat package.json | jq '.version'`.

## Adding new packages to the monorepo

Manually creating a new monorepo package can be a tedious, even frustrating process. To alleviate that problem, we have created a CLI that automates most of the job for us, creatively titled `create-package`.

See the [README](../scripts/create-package/) for more information on how to use this tool.
