import { describe, it, expect } from 'vitest';
import { escapeTestId, createTestId } from './testId';

describe('escapeTestId', () => {
  it('should replace colons with dashes', () => {
    expect(escapeTestId('eip155:1')).toBe('eip155-1');
    expect(escapeTestId('eip155:11155111')).toBe('eip155-11155111');
    expect(escapeTestId('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBe(
      'solana-5eykt4usfv8p8njdtrepy1vzqkqzkvdp',
    );
  });

  it('should convert to lowercase', () => {
    expect(escapeTestId('ETH_BLOCKNUMBER')).toBe('eth-blocknumber');
    expect(escapeTestId('EIP155')).toBe('eip155');
  });

  it('should replace underscores with dashes', () => {
    expect(escapeTestId('eth_signTypedData_v4')).toBe('eth-signtypeddata-v4');
    expect(escapeTestId('personal_sign')).toBe('personal-sign');
  });

  it('should replace spaces with dashes', () => {
    expect(escapeTestId('hello world')).toBe('hello-world');
    expect(escapeTestId('multiple   spaces')).toBe('multiple-spaces');
  });

  it('should remove special characters', () => {
    expect(escapeTestId('0x1234...5678')).toBe('0x12345678');
    expect(escapeTestId('test@example.com')).toBe('testexamplecom');
    expect(escapeTestId('test#special$chars!')).toBe('testspecialchars');
  });

  it('should handle empty strings', () => {
    expect(escapeTestId('')).toBe('');
  });

  it('should handle strings with only special characters', () => {
    expect(escapeTestId('...')).toBe('');
    expect(escapeTestId('###')).toBe('');
  });

  it('should handle CAIP account IDs', () => {
    expect(
      escapeTestId('eip155:1:0x1234567890123456789012345678901234567890'),
    ).toBe('eip155-1-0x1234567890123456789012345678901234567890');
  });
});

describe('createTestId', () => {
  it('should join parts with dashes', () => {
    expect(createTestId('scope-card', 'container')).toBe('scope-card-container');
    expect(createTestId('app', 'btn', 'connect')).toBe('app-btn-connect');
  });

  it('should escape all parts', () => {
    expect(createTestId('scope-card', 'container', 'eip155:1')).toBe(
      'scope-card-container-eip155-1',
    );
    expect(createTestId('legacy-evm', 'btn', 'eth_signTypedData_v4')).toBe(
      'legacy-evm-btn-eth-signtypeddata-v4',
    );
  });

  it('should filter out empty parts', () => {
    expect(createTestId('scope-card', '', 'container')).toBe(
      'scope-card-container',
    );
    expect(createTestId('', 'app', 'btn')).toBe('app-btn');
  });

  it('should handle single part', () => {
    expect(createTestId('single')).toBe('single');
  });

  it('should handle parts that become empty after escaping', () => {
    expect(createTestId('valid', '...')).toBe('valid');
  });

  it('should produce consistent results for scope cards', () => {
    const scope = 'eip155:1';
    expect(createTestId('scope-card', scope)).toBe('scope-card-eip155-1');
  });

  it('should produce consistent results for method results', () => {
    const scope = 'eip155:1';
    const method = 'eth_getBalance';
    const index = 0;
    expect(createTestId('scope-card', 'result', scope, method, String(index))).toBe(
      'scope-card-result-eip155-1-eth-getbalance-0',
    );
  });
});
