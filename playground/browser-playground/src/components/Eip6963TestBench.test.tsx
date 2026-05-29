import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TEST_IDS } from '@metamask/playground-ui';
import type {
  EIP1193Provider,
  MetamaskConnectEVM,
} from '@metamask/connect-evm';

import { Eip6963TestBench } from './Eip6963TestBench';

jest.mock('@metamask/connect-evm', () => ({
  EIP6963_ANNOUNCE_PROVIDER_EVENT: 'eip6963:announceProvider',
  EIP6963_REQUEST_PROVIDER_EVENT: 'eip6963:requestProvider',
}));

const uuid = '11111111-2222-4333-8444-555555555555';

const createProvider = (): EIP1193Provider =>
  ({
    request: jest.fn(),
  }) as unknown as EIP1193Provider;

const createSdk = (): MetamaskConnectEVM =>
  ({
    announceProvider: jest.fn().mockResolvedValue(undefined),
  }) as unknown as MetamaskConnectEVM;

const dispatchAnnouncement = (provider: EIP1193Provider): void => {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: {
            name: 'MetaMask',
            rdns: 'io.metamask.mmc',
            uuid,
          },
          provider,
        },
      }),
    );
  });
};

describe('Eip6963TestBench', () => {
  it('renders an empty state and disabled SDK announce button', () => {
    render(
      <Eip6963TestBench legacyProvider={undefined} legacySDK={undefined} />,
    );

    expect(screen.getByTestId(TEST_IDS.eip6963.section)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.eip6963.title)).toHaveTextContent(
      'EIP-6963 test bench',
    );
    expect(screen.getByTestId(TEST_IDS.eip6963.emptyState)).toHaveTextContent(
      'No announcements observed',
    );
    expect(
      screen.getByTestId(TEST_IDS.eip6963.btnAnnounceSdkProvider),
    ).toBeDisabled();
  });

  it('records an EIP-6963 announcement event', () => {
    const legacyProvider = createProvider();

    render(
      <Eip6963TestBench
        legacyProvider={legacyProvider}
        legacySDK={undefined}
      />,
    );

    dispatchAnnouncement(legacyProvider);

    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementRow(0)),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementName(0)),
    ).toHaveTextContent('MetaMask');
    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementRdns(0)),
    ).toHaveTextContent('io.metamask.mmc');
    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementUuid(0)),
    ).toHaveTextContent(uuid);
    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementHasProviderRequest(0)),
    ).toHaveTextContent('Yes');
    expect(
      screen.getByRole('columnheader', { name: 'MMConnect SDK provider' }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementIsLegacyProvider(0)),
    ).toHaveTextContent('Yes');
  });

  it('dispatches an EIP-6963 provider request event', () => {
    const requestListener = jest.fn();
    window.addEventListener('eip6963:requestProvider', requestListener);

    try {
      render(
        <Eip6963TestBench legacyProvider={undefined} legacySDK={undefined} />,
      );

      fireEvent.click(screen.getByTestId(TEST_IDS.eip6963.btnRequestProviders));

      expect(requestListener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('eip6963:requestProvider', requestListener);
    }
  });

  it('calls announceProvider on the SDK instance', async () => {
    const legacySDK = createSdk();

    render(
      <Eip6963TestBench legacyProvider={undefined} legacySDK={legacySDK} />,
    );

    fireEvent.click(
      screen.getByTestId(TEST_IDS.eip6963.btnAnnounceSdkProvider),
    );

    await waitFor(() => {
      expect(legacySDK.announceProvider).toHaveBeenCalledTimes(1);
    });
  });

  it('clears observed announcements', () => {
    const legacyProvider = createProvider();

    render(
      <Eip6963TestBench
        legacyProvider={legacyProvider}
        legacySDK={undefined}
      />,
    );

    dispatchAnnouncement(legacyProvider);

    expect(
      screen.getByTestId(TEST_IDS.eip6963.announcementRow(0)),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(TEST_IDS.eip6963.btnClear));

    expect(
      screen.queryByTestId(TEST_IDS.eip6963.announcementRow(0)),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.eip6963.emptyState)).toHaveTextContent(
      'No announcements observed',
    );
  });
});
