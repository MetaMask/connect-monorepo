import { useEffect, useRef, useState } from 'react';
import { TEST_IDS } from '@metamask/playground-ui';
import type {
  EIP1193Provider,
  MetamaskConnectEVM,
} from '@metamask/connect-evm';

const EIP6963_ANNOUNCE_PROVIDER_EVENT = 'eip6963:announceProvider';
const EIP6963_REQUEST_PROVIDER_EVENT = 'eip6963:requestProvider';
const MAX_ANNOUNCEMENTS = 25;
const NOT_AVAILABLE = 'Not available';

type Eip6963AnnounceProviderDetail = {
  info?: {
    name?: unknown;
    rdns?: unknown;
    uuid?: unknown;
  };
  provider?: unknown;
};

type Eip6963AnnouncementRow = {
  id: number;
  observedAt: string;
  name: string;
  rdns: string;
  uuid: string;
  hasProviderRequest: boolean;
  isLegacyProvider: boolean;
};

type Eip6963TestBenchProps = {
  legacyProvider: EIP1193Provider | undefined;
  legacySDK: MetamaskConnectEVM | undefined;
};

let nextAnnouncementId = 0;

const displayString = (value: unknown): string =>
  typeof value === 'string' && value.length > 0 ? value : NOT_AVAILABLE;

const hasRequestFunction = (
  provider: unknown,
): provider is { request: (...args: unknown[]) => unknown } =>
  typeof provider === 'object' &&
  provider !== null &&
  'request' in provider &&
  typeof provider.request === 'function';

export function Eip6963TestBench({
  legacyProvider,
  legacySDK,
}: Eip6963TestBenchProps) {
  const [announcements, setAnnouncements] = useState<Eip6963AnnouncementRow[]>(
    [],
  );
  const legacyProviderRef = useRef(legacyProvider);

  useEffect(() => {
    legacyProviderRef.current = legacyProvider;
  }, [legacyProvider]);

  useEffect(() => {
    const handleAnnouncement = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963AnnounceProviderDetail>)
        .detail;
      const provider = detail?.provider;

      nextAnnouncementId += 1;
      const announcement: Eip6963AnnouncementRow = {
        id: nextAnnouncementId,
        observedAt: new Date().toLocaleTimeString(),
        name: displayString(detail?.info?.name),
        rdns: displayString(detail?.info?.rdns),
        uuid: displayString(detail?.info?.uuid),
        hasProviderRequest: hasRequestFunction(provider),
        isLegacyProvider:
          provider !== undefined && provider === legacyProviderRef.current,
      };

      setAnnouncements((previous) =>
        [announcement, ...previous].slice(0, MAX_ANNOUNCEMENTS),
      );
    };

    window.addEventListener(
      EIP6963_ANNOUNCE_PROVIDER_EVENT,
      handleAnnouncement,
    );

    return () => {
      window.removeEventListener(
        EIP6963_ANNOUNCE_PROVIDER_EVENT,
        handleAnnouncement,
      );
    };
  }, []);

  const requestProviders = () => {
    window.dispatchEvent(new Event(EIP6963_REQUEST_PROVIDER_EVENT));
  };

  const announceSdkProvider = async () => {
    if (legacySDK === undefined) {
      return;
    }

    try {
      await legacySDK.announceProvider();
    } catch (error) {
      console.error('Failed to announce EIP-6963 SDK provider', error);
    }
  };

  const clearAnnouncements = () => {
    setAnnouncements([]);
  };

  return (
    <section
      className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
      data-testid={TEST_IDS.eip6963.section}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-lg font-semibold text-gray-900"
          data-testid={TEST_IDS.eip6963.title}
        >
          EIP-6963 test bench
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            data-testid={TEST_IDS.eip6963.btnRequestProviders}
            onClick={requestProviders}
            type="button"
          >
            Request providers
          </button>
          <button
            className="px-3 py-1.5 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            data-testid={TEST_IDS.eip6963.btnAnnounceSdkProvider}
            disabled={legacySDK === undefined}
            onClick={announceSdkProvider}
            type="button"
          >
            Announce SDK provider
          </button>
          <button
            className="px-3 py-1.5 rounded bg-gray-200 text-gray-900 text-sm font-medium hover:bg-gray-300"
            data-testid={TEST_IDS.eip6963.btnClear}
            onClick={clearAnnouncements}
            type="button"
          >
            Clear
          </button>
        </div>
      </div>

      {announcements.length === 0 ? (
        <p
          className="mt-4 text-sm text-gray-500"
          data-testid={TEST_IDS.eip6963.emptyState}
        >
          No announcements observed
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-2 py-2 font-semibold" scope="col">
                  Observed
                </th>
                <th className="px-2 py-2 font-semibold" scope="col">
                  Name
                </th>
                <th className="px-2 py-2 font-semibold" scope="col">
                  RDNS
                </th>
                <th className="px-2 py-2 font-semibold" scope="col">
                  UUID
                </th>
                <th className="px-2 py-2 font-semibold" scope="col">
                  Provider request
                </th>
                <th className="px-2 py-2 font-semibold" scope="col">
                  Legacy provider
                </th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((announcement, index) => (
                <tr
                  className="border-b border-gray-100 last:border-b-0"
                  data-testid={TEST_IDS.eip6963.announcementRow(index)}
                  key={announcement.id}
                >
                  <td className="px-2 py-2 text-gray-600">
                    {announcement.observedAt}
                  </td>
                  <td
                    className="px-2 py-2 text-gray-900"
                    data-testid={TEST_IDS.eip6963.announcementName(index)}
                  >
                    {announcement.name}
                  </td>
                  <td
                    className="px-2 py-2 text-gray-900"
                    data-testid={TEST_IDS.eip6963.announcementRdns(index)}
                  >
                    {announcement.rdns}
                  </td>
                  <td
                    className="px-2 py-2 font-mono text-xs text-gray-700"
                    data-testid={TEST_IDS.eip6963.announcementUuid(index)}
                  >
                    {announcement.uuid}
                  </td>
                  <td
                    className="px-2 py-2 text-gray-900"
                    data-testid={TEST_IDS.eip6963.announcementHasProviderRequest(
                      index,
                    )}
                  >
                    {announcement.hasProviderRequest ? 'Yes' : 'No'}
                  </td>
                  <td
                    className="px-2 py-2 text-gray-900"
                    data-testid={TEST_IDS.eip6963.announcementIsLegacyProvider(
                      index,
                    )}
                  >
                    {announcement.isLegacyProvider ? 'Yes' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
