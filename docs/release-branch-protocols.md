# Release Branch Protocols

This document captures the rules that govern **which packages must be released together**
when a release branch is prepared in `connect-monorepo`. These rules apply on top of the
mechanical workflow described in [Releasing changes](./contributing.md#releasing-changes).

Most of these rules are enforced automatically by
[`@metamask/create-release-branch`](https://github.com/MetaMask/create-release-branch) (see
[Tooling enforcement](#tooling-enforcement)), but understanding them is essential for
review (see [Reviewing Release PRs](./reviewing-release-prs.md)) and for cases where the
tool requires a judgement call from the release author.

## Table of contents

- [Why these rules exist](#why-these-rules-exist)
- [Definitions](#definitions)
- [Core protocol](#core-protocol)
- [Canonical scenarios](#canonical-scenarios)
- [Operational checklist for release authors](#operational-checklist-for-release-authors)
- [Tooling enforcement](#tooling-enforcement)
- [Open gaps and future work](#open-gaps-and-future-work)

## Why these rules exist

Several public packages in this monorepo (`@metamask/connect-evm`,
`@metamask/connect-solana`, ...) declare `@metamask/connect-multichain` as a **peer
dependency**. From [`packages/connect-evm/package.json`](../packages/connect-evm/package.json)
and [`packages/connect-solana/package.json`](../packages/connect-solana/package.json):

```json
"peerDependencies": {
  "@metamask/connect-multichain": "workspace:^"
}
```

At publish time, Yarn rewrites `workspace:^` to `^<connect-multichain-version-at-publish>`
in the published manifest. So if `connect-evm@1.4.0` is published while
`connect-multichain` is at `1.0.0`, the published `connect-evm@1.4.0` manifest pins
`@metamask/connect-multichain: ^1.0.0`.

This has two consequences a release must respect:

1. **Co-installability.** When a consumer installs `@metamask/connect-evm` and
   `@metamask/connect-solana` together (a supported configuration — see the
   [architecture diagram](./architecture.md#package-topology)), `npm` / `yarn` must be
   able to satisfy _both_ packages' peer dependency ranges with a _single_ resolved
   version of `@metamask/connect-multichain`. If one adapter ships with `^1.0.0` and the
   other ships with `^2.0.0`, the install fails (or, worse, silently picks one and warns).
2. **Minimum-version honesty.** A new `connect-evm` published _immediately after_ a
   `connect-multichain` minor bump captures the new minor as its peer floor (because
   `workspace:^` resolves against the current workspace version). That is the right thing
   to do _if_ the new `connect-evm` actually relies on the new `connect-multichain`
   feature, and a no-op otherwise.

These two constraints drive the [core protocol](#core-protocol).

## Definitions

- **Ecosystem client** — a public workspace package that has
  `@metamask/connect-multichain` as a `peerDependency`. Currently:
  `@metamask/connect-evm`, `@metamask/connect-solana`.
- **Relies on** — has source changes (since its previous published tag) that depend on
  the new behaviour or API surface of a new `@metamask/connect-multichain` release.
  Bumping just to refresh the peer range without consuming any new behaviour does **not**
  count as "relies on".
- **Breaking change to a peer-dep'd package** — a `major` bump (per
  [SemVer](https://semver.org/)). This is the only kind of bump that invalidates an
  existing `^X.Y.Z` peer range on downstream packages.

## Core protocol

For each release branch:

1. **An ecosystem client MUST be released alongside `@metamask/connect-multichain` if and
   only if either:**
   - **(a)** it relies on the new `@metamask/connect-multichain` behaviour, or
   - **(b)** the `@metamask/connect-multichain` release is a `major` bump.

   Case (a) is enforced by the changelog/review pass — if the adapter has source-level
   changes that depend on the new multichain release, the adapter has its own changelog
   entries and is included by `hasChangesSinceLatestRelease`.

   Case (b) is enforced by `create-release-branch` (see
   [Tooling enforcement](#tooling-enforcement)).

2. **An ecosystem client MUST NOT be released solely because its peer dep was bumped
   non-breakingly.** A no-op release that re-tightens the `^1.0.0` floor to `^1.1.0`
   without any consumer-visible change is noise in `npm` and in changelogs. Skip it.

3. **All ecosystem clients that peer-depend on a package being released with a `major`
   bump MUST be released in the same release branch.** Otherwise, the unreleased
   ecosystem client will keep the previous peer range, which by definition no longer
   satisfies the new major, and co-installing the released ecosystem client with the
   unreleased one becomes impossible.

4. **The `intentionally-skip` directive is a last resort.** `create-release-branch`
   accepts `intentionally-skip` as a per-package value in the release spec to bypass a
   "missing peer dependent" error. Use it only when _both_ hold:
   - The skipped package genuinely does not need to be published (e.g. it has been
     deprecated or is unused), **and**
   - You have a follow-up plan to keep it consistent (e.g. retire the package, or
     publish it on a subsequent release).

   Skipping for convenience (e.g. "I'll publish it later") creates the co-installability
   failure described above. If in doubt, do not skip.

## Canonical scenarios

The starting state for all three scenarios:

```text
@metamask/connect-evm@1.0.0
  peerDependencies: { @metamask/connect-multichain: ^1.0.0 }

@metamask/connect-solana@1.0.0
  peerDependencies: { @metamask/connect-multichain: ^1.0.0 }

@metamask/connect-multichain@1.0.0
```

### Scenario 1 — minor bump of the peer dep, nobody consumes it

`@metamask/connect-multichain@1.1.0` is released. No ecosystem client uses the new
behaviour.

**Release set:** `@metamask/connect-multichain@1.1.0` only.

Why:

- `^1.0.0` already satisfies `1.1.0`, so the existing published `connect-evm@1.0.0` and
  `connect-solana@1.0.0` remain co-installable with `connect-multichain@1.1.0`.
- Neither adapter relies on the new behaviour, so rule (a) does not apply.
- Per rule 2, do **not** ship a no-op release of either adapter.

### Scenario 2 — minor bump of the peer dep, one adapter consumes it

`@metamask/connect-multichain@1.1.0` is released. `@metamask/connect-evm` is updated to
use the new behaviour.

**Release set:** `@metamask/connect-multichain@1.1.0` **and**
`@metamask/connect-evm@<new>`.

Why:

- `connect-evm` "relies on" the change (rule 1a), so it must ship. Because the published
  `connect-evm` resolves `workspace:^` against the new multichain version, the new
  `connect-evm` will ship with `peerDependencies.connect-multichain: ^1.1.0` — i.e. it
  correctly advertises the new minimum it needs.
- `connect-solana` is unchanged and `^1.0.0` still satisfies `1.1.0`. Co-installing
  `connect-evm@<new>` (peer `^1.1.0`) with the still-published
  `connect-solana@1.0.0` (peer `^1.0.0`) resolves cleanly to `connect-multichain@1.1.0`.
  Per rule 2, do **not** release a no-op `connect-solana`.

### Scenario 3 — major (breaking) bump of the peer dep, one adapter consumes it

`@metamask/connect-multichain@2.0.0` is released. `@metamask/connect-evm` is updated to
adopt the breaking change.

**Release set:** `@metamask/connect-multichain@2.0.0`, `@metamask/connect-evm@<new>`,
**and** `@metamask/connect-solana@<new>`.

Why:

- `connect-evm` is required by rule 1a (relies on the change). The new `connect-evm`
  publishes with `peerDependencies.connect-multichain: ^2.0.0`.
- `connect-solana` is required by **rule 3 / rule 1b**: even though it has no source
  changes, its currently-published peer range `^1.0.0` is incompatible with `2.0.0`. A
  consumer using both adapters together would otherwise get a peer-dependency conflict.
  Releasing a `connect-solana` whose only diff is the regenerated `^2.0.0` peer range
  restores co-installability.

This is the case `create-release-branch` raises as a hard error if you forget; see
[Tooling enforcement](#tooling-enforcement).

## Operational checklist for release authors

When you run `yarn prepare-release`, work through this checklist before clicking
"Confirm":

1. **Identify the set of public packages being released.** Filter to the ones with a
   version bump in the release spec.
2. **For each package being released that other workspace packages list as a
   `peerDependency`:**
   - Is the bump a `major`? If yes, **every** workspace package that lists it as a peer
     dependency must also be in the release set. (`create-release-branch` enforces this;
     do not bypass with `intentionally-skip` casually — see rule 4.)
   - Is the bump `minor` or `patch`? Then ecosystem clients are included **only if** they
     have source changes that rely on the new behaviour. Adapters with no source-level
     dependence stay on their current published version.
3. **For each package being released that lists a workspace package as a `dependency` or
   `peerDependency`:** the tool prompts you if the dependency itself has unreleased
   changes. Decide whether the depending package actually needs the new dependency
   version, and include / skip accordingly.
4. **Sanity check co-installability.** After the tool finishes, the released ecosystem
   clients should all advertise compatible peer ranges. With `workspace:^`, this is
   automatic — but verify by inspecting the diffs to `packages/*/package.json` in the
   release branch.

## Tooling enforcement

`yarn prepare-release` (= `yarn create-release-branch -i` +
`yarn bump-playground-versions`) enforces most of the above through
`@metamask/create-release-branch` v4.1.3. Concretely:

- **Auto-population.** Packages with source changes since their last release
  (`hasChangesSinceLatestRelease`) are pre-listed in the release spec. The UI also adds
  peer dependents of any package the user marks as a `major` bump, so the user can pick
  a version for them directly. (File-based flow does not — see
  [Open gaps](#open-gaps-and-future-work).)
- **Major-bump peer-dependent enforcement.** Implemented by
  `findMissingUnreleasedDependentsForBreakingChanges` (renamed to
  `findCandidateDependentsOfTypeForMajorBump` on upstream `main`). If a package is
  bumped `major` (either via the `major` directive or an explicit `X+1.0.0` version) and
  any workspace package that peer-depends on it is missing from the release spec, the
  tool refuses to proceed and prints the missing dependents.
- **Missing-dependency warnings.** Implemented by `findMissingUnreleasedDependencies`.
  If a package is being released and one of its workspace `dependencies` or
  `peerDependencies` has unreleased changes but is not in the release spec, the tool
  raises an error. This is the safeguard for rule 1a.
- **Peer-range regeneration.** Yarn's `workspace:^` protocol is what makes
  `peerDependencies.connect-multichain` track the freshly-bumped multichain version at
  publish time. The `yarn.config.cjs` constraints (see
  `expectUpToDateWorkspacePeerDependencies`) keep the source manifests using
  `workspace:^` instead of pinned ranges. Combined, these guarantee that any newly
  published ecosystem client correctly captures the current multichain version as its
  peer floor.
- **Non-major bumps do not require dependents.** This is intentional — see Scenarios 1
  and 2. A `minor` / `patch` bump of `connect-multichain` does **not** force
  `connect-evm` or `connect-solana` into the release spec.

The only escape hatch is the per-package `intentionally-skip` directive in the release
spec. See [rule 4](#core-protocol) for when it is appropriate.

## Open gaps and future work

These are known limitations of the current tooling that the release author has to cover
manually. Some are good candidates for upstream contributions to
`@metamask/create-release-branch`.

1. **File-based template does not include "required" peer dependents until you bump
   manually.** When you run `yarn create-release-branch` without `-i` (so the YAML
   editor flow rather than the UI), the template only lists packages with source
   changes. If `connect-multichain` has source changes but `connect-evm` /
   `connect-solana` do not, you have to add them to the YAML _and_ bump
   `connect-multichain` to `major` before the validator can tell you they were required.
   The interactive UI already does the right thing here (`requiredDependents` in
   `dist/ui.js`), so the fix would be to mirror that behaviour in
   `generateReleaseSpecificationTemplateForMonorepo` once a `major` selection is known.
   Practical mitigation: prefer `yarn prepare-release` (the interactive flow).
2. **No automatic enforcement of rule 1a.** "`connect-evm` relies on the change" is a
   judgement call. The tool can detect that `connect-multichain` is in the release spec
   and that `connect-evm` has source changes (in which case
   `findMissingUnreleasedDependencies` raises if you forgot to include
   `connect-multichain`), but it cannot tell whether a `connect-evm` _without_ source
   changes silently relies on a new multichain feature. This must be caught in code
   review of the source diff before opening the release PR.
3. **No automatic enforcement of "no no-op releases".** The tool does not refuse a
   release that has no consumer-visible changes. If a `connect-solana` ends up in the
   release set whose only diff is a manifest-level peer range refresh that isn't
   strictly required (i.e. a minor bump scenario where the old `^X.0.0` still satisfies
   the new minor), the validator does not flag it. Review-time vigilance is the current
   mitigation, captured in [reviewing-release-prs.md](./reviewing-release-prs.md).
4. **`intentionally-skip` has no policy enforcement.** A user can suppress any of the
   above errors by adding `intentionally-skip` per package. There is currently no
   automated check that flags a release spec containing `intentionally-skip` for review.
   Until there is, treat any `intentionally-skip` entry in a release PR as something
   that must be explicitly justified in the PR description.
