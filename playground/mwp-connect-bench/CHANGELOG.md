# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial benchmark harness for MetaMask Connect (MWP) deeplink connection latency against MetaMask Mobile: instrumentation patch, session seeder, cold-start trial runner, and log analyzer
- Approval-path measurement: `create_session_received` marker in the instrumentation, `--with-request` trial mode (inline `wallet_createSession`), and an "approval gate" metric in the analyzer — enables A/B of metamask-mobile#32470 (eager approval)
- Dedicated instrumentation patch variant for metamask-mobile#32470's refactored `Connection` service, plus a per-PR measurement guide in the README
