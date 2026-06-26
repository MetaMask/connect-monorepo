# metamask-connect — Agent Skill

An [agent skill](https://skills.sh) for building dApps that integrate MetaMask via the **MetaMask Connect SDK** — EVM (`@metamask/connect-evm`), Solana (`@metamask/connect-solana`), and multichain (`@metamask/connect-multichain`), plus the wagmi `metaMask()` connector.

It teaches coding agents (Cursor, Claude Code, Copilot, Codex, etc.) how to set up clients across browser / React / React Native / nodejs, connect and manage sessions, sign messages, send transactions, run multichain `invokeMethod` across CAIP-2 scopes, migrate from `@metamask/sdk`, and troubleshoot connection/polyfill issues — with guidance source-verified against the published packages.

## Install

The skill is distributed straight from this repo with the [`skills` CLI](https://github.com/vercel-labs/skills):

```bash
# Install just this skill (no prompts), into the agent the CLI detects
npx skills add MetaMask/metamask-connect --skill metamask-connect -y

# Or run it interactively to choose agent + scope
npx skills add MetaMask/metamask-connect --skill metamask-connect

# Install globally (available across all your projects)
npx skills add MetaMask/metamask-connect --skill metamask-connect -g -y

# Preview what's in the repo without installing
npx skills add MetaMask/metamask-connect --list
```

By default the CLI symlinks the skill into your agent's directory (e.g. `.cursor/skills/`); pass `--copy` to copy the files instead. Search the bare term `metamask` with `npx skills find metamask` to locate it in the directory.

## What's inside

```
metamask-connect/
├── SKILL.md          # entry point — routing table the agent reads first
├── references/       # focused, always-on guidance per topic
│   ├── conventions.md      # core guardrails (import paths, config, supportedNetworks, errors)
│   ├── evm.md              # chain IDs / switchChain
│   ├── solana.md           # CAIP-2 genesis hashes, wallet-adapter, platform limits
│   ├── multichain.md       # singleton, sessions, invokeMethod, lazy transport
│   ├── events.md           # EIP-1193 events, eventHandlers, Solana state changes
│   ├── react-native.md     # polyfills / Metro config
│   ├── csp.md              # Content Security Policy
│   ├── testing.md          # mocking the client
│   └── troubleshooting.md  # symptom → cause → fix index
└── workflows/        # step-by-step setup, sign/send, multichain, and migration guides
```

The agent reads `SKILL.md` first, then loads the relevant reference(s) and workflow for the task at hand.

## License

This skill is part of the metamask-connect and is covered by the repository's [`LICENCE`](../../LICENCE).
