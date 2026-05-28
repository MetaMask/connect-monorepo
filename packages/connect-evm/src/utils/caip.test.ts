/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import type { SessionData } from '@metamask/connect-multichain';
import { describe, expect, it } from 'vitest';

import {
  getEthAccounts,
  getPermittedEthChainIds,
  parseScopeString,
} from './caip';

describe('parseScopeString', () => {
  it('returns just the namespace for a bare CAIP namespace', () => {
    expect(parseScopeString('eip155')).toStrictEqual({ namespace: 'eip155' });
    expect(parseScopeString('wallet')).toStrictEqual({ namespace: 'wallet' });
  });

  it('returns namespace + reference for a full CAIP-2 chain ID', () => {
    expect(parseScopeString('eip155:1')).toStrictEqual({
      namespace: 'eip155',
      reference: '1',
    });
    expect(parseScopeString('eip155:137')).toStrictEqual({
      namespace: 'eip155',
      reference: '137',
    });
    expect(
      parseScopeString('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'),
    ).toStrictEqual({
      namespace: 'solana',
      reference: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    });
  });

  it('returns an empty object for invalid scope strings', () => {
    expect(parseScopeString('')).toStrictEqual({});
    expect(parseScopeString('not a scope')).toStrictEqual({});
    expect(parseScopeString('eip155:1:extra')).toStrictEqual({});
  });
});

describe('getEthAccounts', () => {
  it('returns [] for undefined sessionScopes', () => {
    expect(getEthAccounts(undefined)).toStrictEqual([]);
  });

  it('returns [] for empty sessionScopes', () => {
    expect(getEthAccounts({})).toStrictEqual([]);
  });

  it('extracts EIP-155 accounts across multiple scopes', () => {
    const sessionScopes = {
      'eip155:1': {
        accounts: ['eip155:1:0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa'],
        methods: [],
        notifications: [],
      },
      'eip155:137': {
        accounts: ['eip155:137:0xBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbb'],
        methods: [],
        notifications: [],
      },
    } as unknown as SessionData['sessionScopes'];

    expect(getEthAccounts(sessionScopes)).toStrictEqual([
      '0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa',
      '0xBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbb',
    ]);
  });

  it('parses the eip155:0:<address> reference-zero form', () => {
    const sessionScopes = {
      'eip155:0': {
        accounts: ['eip155:0:0xabc0000000000000000000000000000000000000'],
        methods: [],
        notifications: [],
      },
    } as unknown as SessionData['sessionScopes'];

    expect(getEthAccounts(sessionScopes)).toStrictEqual([
      '0xabc0000000000000000000000000000000000000',
    ]);
  });

  it('deduplicates addresses that appear in multiple scopes', () => {
    const sharedAddress = '0xCCCCccccCCCCccccCCCCccccCCCCccccCCCCcccc';
    const sessionScopes = {
      'eip155:1': {
        accounts: [`eip155:1:${sharedAddress}`],
        methods: [],
        notifications: [],
      },
      'eip155:10': {
        accounts: [`eip155:10:${sharedAddress}`],
        methods: [],
        notifications: [],
      },
    } as unknown as SessionData['sessionScopes'];

    expect(getEthAccounts(sessionScopes)).toStrictEqual([sharedAddress]);
  });

  it('skips non-EIP-155 namespaces (e.g. solana, bip122)', () => {
    const sessionScopes = {
      'eip155:1': {
        accounts: ['eip155:1:0xDDDDddddDDDDddddDDDDddddDDDDddddDDDDdddd'],
        methods: [],
        notifications: [],
      },
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
        accounts: [
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ],
        methods: [],
        notifications: [],
      },
    } as unknown as SessionData['sessionScopes'];

    expect(getEthAccounts(sessionScopes)).toStrictEqual([
      '0xDDDDddddDDDDddddDDDDddddDDDDddddDDDDdddd',
    ]);
  });

  it('drops accounts whose address is not a strict 0x hex string', () => {
    const sessionScopes = {
      'eip155:1': {
        accounts: [
          'eip155:1:0xEEEEeeeeEEEEeeeeEEEEeeeeEEEEeeeeEEEEeeee',
          'eip155:1:not-a-hex-address',
        ],
        methods: [],
        notifications: [],
      },
    } as unknown as SessionData['sessionScopes'];

    expect(getEthAccounts(sessionScopes)).toStrictEqual([
      '0xEEEEeeeeEEEEeeeeEEEEeeeeEEEEeeeeEEEEeeee',
    ]);
  });

  it('ignores scopes whose accounts array is missing or empty', () => {
    const sessionScopes = {
      'eip155:1': {
        accounts: ['eip155:1:0xFFFFffffFFFFffffFFFFffffFFFFffffFFFFffff'],
        methods: [],
        notifications: [],
      },
      'eip155:137': {
        methods: [],
        notifications: [],
      },
      'eip155:42161': {
        accounts: [],
        methods: [],
        notifications: [],
      },
    } as unknown as SessionData['sessionScopes'];

    expect(getEthAccounts(sessionScopes)).toStrictEqual([
      '0xFFFFffffFFFFffffFFFFffffFFFFffffFFFFffff',
    ]);
  });
});

describe('getPermittedEthChainIds', () => {
  it('returns [] for undefined sessionScopes', () => {
    expect(getPermittedEthChainIds(undefined)).toStrictEqual([]);
  });

  it('returns [] for empty sessionScopes', () => {
    expect(getPermittedEthChainIds({})).toStrictEqual([]);
  });

  it('converts EIP-155 references to 0x-prefixed hex chain IDs', () => {
    const sessionScopes = {
      'eip155:1': { accounts: [], methods: [], notifications: [] },
      'eip155:137': { accounts: [], methods: [], notifications: [] },
      'eip155:42161': { accounts: [], methods: [], notifications: [] },
    } as unknown as SessionData['sessionScopes'];

    expect(getPermittedEthChainIds(sessionScopes)).toStrictEqual([
      '0x1',
      '0x89',
      '0xa4b1',
    ]);
  });

  it('skips bare-namespace scopes without a reference', () => {
    const sessionScopes = {
      eip155: { accounts: [], methods: [], notifications: [] },
      'eip155:1': { accounts: [], methods: [], notifications: [] },
    } as unknown as SessionData['sessionScopes'];

    expect(getPermittedEthChainIds(sessionScopes)).toStrictEqual(['0x1']);
  });

  it('skips non-EIP-155 namespaces', () => {
    const sessionScopes = {
      'eip155:1': { accounts: [], methods: [], notifications: [] },
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
        accounts: [],
        methods: [],
        notifications: [],
      },
      wallet: { accounts: [], methods: [], notifications: [] },
    } as unknown as SessionData['sessionScopes'];

    expect(getPermittedEthChainIds(sessionScopes)).toStrictEqual(['0x1']);
  });

  it('handles chain IDs larger than Number.MAX_SAFE_INTEGER via BigInt', () => {
    const big = '12345678901234567890';
    const sessionScopes = {
      [`eip155:${big}`]: { accounts: [], methods: [], notifications: [] },
    } as unknown as SessionData['sessionScopes'];

    expect(getPermittedEthChainIds(sessionScopes)).toStrictEqual([
      `0x${BigInt(big).toString(16)}`,
    ]);
  });

  it('passes through already-hex references without double-encoding', () => {
    const sessionScopes = {
      'eip155:0xabc': { accounts: [], methods: [], notifications: [] },
    } as unknown as SessionData['sessionScopes'];

    expect(getPermittedEthChainIds(sessionScopes)).toStrictEqual(['0xabc']);
  });

  it('deduplicates duplicate chain IDs (e.g. decimal vs hex form)', () => {
    const sessionScopes = {
      'eip155:1': { accounts: [], methods: [], notifications: [] },
      'eip155:0x1': { accounts: [], methods: [], notifications: [] },
    } as unknown as SessionData['sessionScopes'];

    expect(getPermittedEthChainIds(sessionScopes)).toStrictEqual(['0x1']);
  });
});
