import { WINDOW_POST_MESSAGE_ID, TEST_IDS } from '@metamask/playground-ui';
import type { MouseEventHandler } from 'react';

export type WalletMapEntry = {
  params: {
    name: string;
    uuid: string;
    rdns: string;
    icon: string;
    extensionId?: string;
  };
};

type WalletListProps = {
  wallets: Record<string, WalletMapEntry>;
  handleClick: (extensionId: string) => Promise<void>;
  connectedExtensionId: string;
};

function WalletList({
  wallets,
  handleClick,
  connectedExtensionId,
}: WalletListProps) {
  const handleWalletClick =
    (extensionId: string): MouseEventHandler<HTMLButtonElement> =>
    (ev) => {
      ev.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handleClick(extensionId);
    };

  if (Object.keys(wallets).length === 0) {
    return (
      <p data-testid={TEST_IDS.walletList.emptyMessage} className="text-gray-600 text-center py-8">No wallets detected</p>
    );
  }

  return (
    <div data-testid={TEST_IDS.walletList.container} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
      {Object.values(wallets).map((wallet) => {
        const isConnected = wallet.params.extensionId === connectedExtensionId;
        return (
          <div
            key={wallet.params.uuid}
            data-testid={TEST_IDS.walletList.walletItem(wallet.params.uuid)}
            className="bg-gray-100 rounded-lg p-5 flex flex-col items-center shadow-sm"
          >
            <img
              data-testid={TEST_IDS.walletList.walletIcon(wallet.params.uuid)}
              src={wallet.params.icon}
              alt={`${wallet.params.name} icon`}
              className="w-12 h-12 rounded-full mb-4"
            />
            <div className="flex flex-col items-center text-center w-full">
              <h3 data-testid={TEST_IDS.walletList.walletName(wallet.params.uuid)} className="text-lg font-semibold text-gray-800 mb-2">
                {wallet.params.name}
              </h3>
              <p data-testid={TEST_IDS.walletList.walletUuid(wallet.params.uuid)} className="text-sm text-gray-600 mb-1">
                UUID: {wallet.params.uuid}
              </p>
              <p data-testid={TEST_IDS.walletList.walletRdns(wallet.params.uuid)} className="text-sm text-gray-600 mb-1">
                RDNS: {wallet.params.rdns}
              </p>
              {wallet.params.extensionId && (
                <>
                  <p data-testid={TEST_IDS.walletList.walletExtensionId(wallet.params.uuid)} className="text-sm text-gray-600 mb-4">
                    {wallet.params.extensionId === WINDOW_POST_MESSAGE_ID
                      ? null
                      : 'Extension ID: '}
                    {wallet.params.extensionId}
                  </p>
                  <button
                    type="button"
                    data-testid={TEST_IDS.walletList.btnConnect(wallet.params.uuid)}
                    onClick={handleWalletClick(wallet.params.extensionId)}
                    disabled={isConnected}
                    className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isConnected ? 'Connected' : 'Connect'}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default WalletList;
