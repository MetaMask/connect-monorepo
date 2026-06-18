# MetaMask Connect — Testing Patterns

Testing patterns for the MetaMask Connect SDK: provider mocking, client mocking, singleton cleanup, test networks, async init, error simulation, and event testing. For always-on core guardrails see [conventions.md](conventions.md).

## Contents

- [Provider Mocking](#provider-mocking)
- [Client Mocking](#client-mocking)
- [Singleton Cleanup](#singleton-cleanup)
- [Test Networks](#test-networks)
- [Async Client Initialization](#async-client-initialization)
- [Error Simulation](#error-simulation)
- [Event Testing](#event-testing)
- [Solana Testing](#solana-testing)

## Provider Mocking

- Mock the EIP-1193 provider's request method for unit tests
- Create a mock provider factory that returns controlled responses
- Example: `const mockProvider = { request: vi.fn(), on: vi.fn(), removeListener: vi.fn() }`
- Mock different responses for different methods (eth_accounts, eth_chainId, etc.)

## Client Mocking

- Mock createEVMClient to return a controlled client object
- Mock client.connect(), client.disconnect(), client.getProvider(), client.switchChain()
- For multichain: mock createMultichainClient, client.invokeMethod(), client.on()

## Singleton Cleanup

- createMultichainClient is a singleton — tests that create clients will share state
- Clear or reset the singleton between test runs
- Use beforeEach/afterEach to ensure clean state

## Test Networks

- Use Sepolia (0xaa36a7) for E2E tests, never mainnet
- For Solana E2E: use devnet — supported in the MetaMask browser extension (mobile supports mainnet only)
- Mock RPC responses for unit tests; use real RPCs only for integration tests

## Async Client Initialization

- createEVMClient and createMultichainClient are async — tests must await them
- In React testing, await the client before rendering components that depend on it
- Use act() wrapper for React state updates triggered by SDK events

## Error Simulation

- Test user rejection: throw { code: 4001, message: 'User rejected' }
- Test pending connection: throw { code: -32002, message: 'Already pending' }
- Test network errors: simulate RPC failures
- Test disconnect scenarios

## Event Testing

- Test that components react to accountsChanged, chainChanged events
- Simulate events by calling the mock provider's event handlers
- Test display_uri event handling for headless mode

## Solana Testing

- Mock wallet-standard wallet object
- Mock signMessage, signAndSendTransaction features
- Test wallet discovery with mocked wallet registry
