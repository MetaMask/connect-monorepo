/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import { describe, expect, it } from 'vitest';

import { TEST_IDS } from './index';

describe('TEST_IDS.eip6963', () => {
  it('defines stable panel selectors', () => {
    expect(TEST_IDS.eip6963.section).toBe('eip6963-section');
    expect(TEST_IDS.eip6963.title).toBe('eip6963-title');
    expect(TEST_IDS.eip6963.btnRequestProviders).toBe(
      'eip6963-btn-request-providers',
    );
    expect(TEST_IDS.eip6963.btnAnnounceSdkProvider).toBe(
      'eip6963-btn-announce-sdk-provider',
    );
    expect(TEST_IDS.eip6963.btnClear).toBe('eip6963-btn-clear');
    expect(TEST_IDS.eip6963.emptyState).toBe('eip6963-empty-state');
  });

  it('defines stable announcement row selectors', () => {
    expect(TEST_IDS.eip6963.announcementRow(0)).toBe(
      'eip6963-announcement-row-0',
    );
    expect(TEST_IDS.eip6963.announcementName(1)).toBe(
      'eip6963-announcement-name-1',
    );
    expect(TEST_IDS.eip6963.announcementRdns(2)).toBe(
      'eip6963-announcement-rdns-2',
    );
    expect(TEST_IDS.eip6963.announcementUuid(3)).toBe(
      'eip6963-announcement-uuid-3',
    );
    expect(TEST_IDS.eip6963.announcementHasProviderRequest(4)).toBe(
      'eip6963-announcement-has-provider-request-4',
    );
    expect(TEST_IDS.eip6963.announcementIsLegacyProvider(5)).toBe(
      'eip6963-announcement-is-legacy-provider-5',
    );
  });
});
