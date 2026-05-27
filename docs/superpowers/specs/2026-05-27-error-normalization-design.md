# Error Normalization Design

## Goal

Normalize wallet invocation errors so callers receive the same public error shape regardless of whether the request used `DefaultTransport` or `MWPTransport`.

`connect-multichain.invokeMethod()` is an SDK-owned API, so it should expose the SDK's canonical invocation error. `connect-evm` exposes an EIP-1193 provider facade, so `provider.request()` should adapt that canonical SDK error into a spec-compliant provider error.

## Current Behavior

The two transports surface wallet failures differently:

- `DefaultTransport` can resolve `wallet_invokeMethod` with a JSON-RPC response containing an `error` object.
- `MWPTransport` can reject the transport request with an `Error`, `JsonRpcError`, or provider error carrying `code` and `message`.

`RequestRouter` already wraps failures as `RPCInvokeMethodErr`, but the route used to reach that wrapper can change `reason`, `rpcCode`, `rpcMessage`, and the final message visible to callers.

## Public Error Contract

### `connect-multichain.invokeMethod()`

`RequestRouter` is the canonical boundary for wallet invocation errors. Both resolved JSON-RPC errors and rejected coded errors should produce the same `RPCInvokeMethodErr` fields.

For a wallet failure such as:

```ts
{ error: { code: 4001, message: 'User rejected the request' } }
```

or:

```ts
Object.assign(new Error('User rejected the request'), { code: 4001 })
```

`invokeMethod()` should reject with:

```ts
new RPCInvokeMethodErr(
  'User rejected the request',
  4001,
  'User rejected the request',
);
```

The exposed shape is:

```ts
{
  message: 'RPCErr53: RPC Client invoke method reason (User rejected the request)',
  code: 53,
  reason: 'User rejected the request',
  rpcCode: 4001,
  rpcMessage: 'User rejected the request',
}
```

If the underlying error has no wallet RPC code, `invokeMethod()` should still reject with `RPCInvokeMethodErr`, preserving the most useful message as `reason` and leaving `rpcCode` / `rpcMessage` unset.

### `connect-evm` EIP-1193 Provider

`EIP1193Provider.request()` should translate a canonical `RPCInvokeMethodErr` with wallet code into a provider-facing error:

```ts
{
  message: 'User rejected the request',
  code: 4001,
}
```

If the SDK error has no wallet RPC code, the provider should preserve the existing SDK/internal error instead of inventing an EIP-1193 wallet code.

## Architecture

Add one small normalization helper near `RequestRouter` that accepts either:

- a JSON-RPC `error` payload from a resolved transport response, or
- an unknown rejected value from a transport request.

The helper should return an `RPCInvokeMethodErr` with normalized fields. `handleWithWallet()` should use this helper for `response.error`, and `#withAnalyticsTracking()` / `toRPCInvokeMethodErr()` should use it for caught errors.

This keeps transport implementations focused on transport mechanics and keeps public API shaping in the router/provider layers.

## Testing

Add focused `RequestRouter` tests proving these inputs normalize identically:

- resolved response with `error: { code: 4001, message: 'User rejected the request' }`
- rejected `Error('User rejected the request')` with `code = 4001`
- resolved response with `error: { code: -32603, message: 'Internal error' }`
- rejected `Error('Internal error')` with `code = -32603`

Each pair should assert the same `RPCInvokeMethodErr` fields: `code`, `message`, `reason`, `rpcCode`, and `rpcMessage`.

Keep existing `EIP1193Provider` tests, and add or adjust coverage so `provider.request()` maps the normalized SDK error to the wallet-facing EIP-1193 shape.

## Non-Goals

- Do not change transport connection, session, deeplink, or notification behavior.
- Do not make `connect-multichain.invokeMethod()` throw EIP-1193 provider errors directly.
- Do not invent wallet RPC codes for internal SDK failures.
- Do not change analytics taxonomy except as a side effect of receiving more consistent `rpcCode` / `rpcMessage` fields.

## Risks

Changing the `RPCInvokeMethodErr.reason` string may affect callers asserting exact SDK messages. The intended behavior is still a normalization fix: wallet errors should use the wallet-facing message as `reason`, while transport/internal errors should keep their current useful message.

The implementation should avoid wrapping an existing `RPCInvokeMethodErr` again, so callers do not lose previously normalized fields.
