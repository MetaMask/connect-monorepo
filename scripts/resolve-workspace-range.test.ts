import { describe, it, expect } from 'vitest';

import { resolveWorkspaceRange } from './resolve-workspace-range';

describe('resolveWorkspaceRange', () => {
  it('returns caret range for workspace:^', () => {
    expect(resolveWorkspaceRange('workspace:^', '1.2.3')).toBe('^1.2.3');
  });

  it('returns tilde range for workspace:~', () => {
    expect(resolveWorkspaceRange('workspace:~', '2.0.0')).toBe('~2.0.0');
  });

  it('returns wildcard for workspace:*', () => {
    expect(resolveWorkspaceRange('workspace:*', '1.0.0')).toBe('*');
  });

  it('returns literal specifier for workspace:<range>', () => {
    expect(resolveWorkspaceRange('workspace:>=1.0.0', '3.0.0')).toBe(
      '>=1.0.0',
    );
  });

  it('passes through non-workspace range unchanged', () => {
    expect(resolveWorkspaceRange('^1.0.0', '1.2.3')).toBe('^1.0.0');
  });

  it('returns empty string for undefined input', () => {
    expect(resolveWorkspaceRange(undefined, '1.0.0')).toBe('');
  });
});
