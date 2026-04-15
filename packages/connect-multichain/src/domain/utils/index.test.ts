import { describe, it, expect, vi, beforeEach } from 'vitest';

import { warnIfPeerMismatch } from '.';

describe('warnIfPeerMismatch', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  const mockSatisfies = vi.fn<(version: string, range: string) => boolean>();

  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // noop
    });
  });

  it('warns when version does not satisfy the peer range', () => {
    mockSatisfies.mockReturnValue(false);

    warnIfPeerMismatch({
      consumerPackageName: '@metamask/connect-evm',
      peerRange: '^1.0.0',
      actualVersion: '2.0.0',
      satisfies: mockSatisfies,
    });

    expect(mockSatisfies).toHaveBeenCalledWith('2.0.0', '^1.0.0');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '@metamask/connect-evm expected @metamask/connect-multichain version ^1.0.0, but got 2.0.0. This may lead to unexpected behavior.',
    );
  });

  it('does not warn when version satisfies the peer range', () => {
    mockSatisfies.mockReturnValue(true);

    warnIfPeerMismatch({
      consumerPackageName: '@metamask/connect-evm',
      peerRange: '^1.0.0',
      actualVersion: '1.2.3',
      satisfies: mockSatisfies,
    });

    expect(mockSatisfies).toHaveBeenCalledWith('1.2.3', '^1.0.0');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('skips check when peerRange is undefined (Metro / React Native)', () => {
    warnIfPeerMismatch({
      consumerPackageName: '@metamask/connect-solana',
      peerRange: undefined,
      actualVersion: '1.0.0',
      satisfies: mockSatisfies,
    });

    expect(mockSatisfies).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('skips check when peerRange is empty string', () => {
    warnIfPeerMismatch({
      consumerPackageName: '@metamask/connect-solana',
      peerRange: '',
      actualVersion: '1.0.0',
      satisfies: mockSatisfies,
    });

    expect(mockSatisfies).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
