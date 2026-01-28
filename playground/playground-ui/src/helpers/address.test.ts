/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import { describe, it, expect } from 'vitest';

import { getCaip25FormattedAddresses } from './address';

describe('getCaip25FormattedAddresses', () => {
  it('should format addresses with scope prefix', () => {
    const result = getCaip25FormattedAddresses('eip155:1', [
      '0x1234567890abcdef',
      '0xabcdef1234567890',
    ]);

    expect(result).toEqual([
      'eip155:1:0x1234567890abcdef',
      'eip155:1:0xabcdef1234567890',
    ]);
  });

  it('should filter out empty addresses', () => {
    const result = getCaip25FormattedAddresses('eip155:1', [
      '0x1234567890abcdef',
      '',
      '0xabcdef1234567890',
      '',
    ]);

    expect(result).toEqual([
      'eip155:1:0x1234567890abcdef',
      'eip155:1:0xabcdef1234567890',
    ]);
  });

  it('should return empty array for empty input', () => {
    const result = getCaip25FormattedAddresses('eip155:1', []);
    expect(result).toEqual([]);
  });

  it('should work with Solana scope', () => {
    const result = getCaip25FormattedAddresses(
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ['FakePublicKey123'],
    );

    expect(result).toEqual([
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:FakePublicKey123',
    ]);
  });
});
