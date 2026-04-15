import { describe, it, expect } from 'vitest';

import { resolveWorkspaceRange } from './resolve-workspace-range';

describe('resolveWorkspaceRange', () => {
  it('returns empty string for undefined range', () => {
    expect(resolveWorkspaceRange(undefined, '1.2.3')).toBe('');
  });

  it('returns the range as-is when it does not start with workspace:', () => {
    expect(resolveWorkspaceRange('^1.0.0', '1.2.3')).toBe('^1.0.0');
  });

  it('resolves workspace:^ to ^actualVersion', () => {
    expect(resolveWorkspaceRange('workspace:^', '1.2.3')).toBe('^1.2.3');
  });

  it('resolves workspace:~ to ~actualVersion', () => {
    expect(resolveWorkspaceRange('workspace:~', '1.2.3')).toBe('~1.2.3');
  });

  it('resolves workspace:* to *', () => {
    expect(resolveWorkspaceRange('workspace:*', '1.2.3')).toBe('*');
  });

  it('returns the specifier for other workspace: ranges', () => {
    expect(resolveWorkspaceRange('workspace:>=2.0.0', '1.2.3')).toBe(
      '>=2.0.0',
    );
  });
});
