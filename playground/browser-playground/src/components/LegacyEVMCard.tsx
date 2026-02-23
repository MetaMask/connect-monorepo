import { useState } from 'react';
import type { EIP1193Provider } from '@metamask/connect/evm';
import { TEST_IDS } from '@metamask/playground-ui';
import { send_eth_signTypedData_v4, send_personal_sign } from '../helpers/SignHelpers';

interface LegacyEVMCardProps {
  provider: EIP1193Provider;
  chainId: string | undefined;
  accounts: string[];
  sdk: any;
  disconnect: () => Promise<void>;
}

export function LegacyEVMCard({
  provider,
  chainId,
  accounts,
  sdk,
  disconnect,
}: LegacyEVMCardProps) {
  const [response, setResponse] = useState<string>('');

  const requestPermissions = async () => {
    if (!provider) {
      setResponse('Provider not available');
      return;
    }
    try {
      const response = await provider.request({
        method: 'wallet_requestPermissions',
        params: [],
      });
      setResponse(`Accounts: ${response}`);
    } catch (e) {
      console.error('Error requesting accounts', e);
      setResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const eth_getBalance = async () => {
    if (!provider || !accounts[0]) {
      setResponse('Provider or accounts not available');
      return;
    }
    try {
      const result = await provider.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest'],
      });
      setResponse(`Balance: ${result}`);
    } catch (e) {
      console.error('Error getting balance', e);
      setResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const eth_blockNumber = async () => {
    if (!provider) {
      setResponse('Provider not available');
      return;
    }
    try {
      const result = await provider.request({
        method: 'eth_blockNumber',
        params: [],
      });
      setResponse(`Block Number: ${result}`);
    } catch (e) {
      console.error('Error getting block number', e);
      setResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const eth_gasPrice = async () => {
    if (!provider) {
      setResponse('Provider not available');
      return;
    }
    try {
      const result = await provider.request({
        method: 'eth_gasPrice',
        params: [],
      });
      setResponse(`Gas Price: ${result}`);
    } catch (e) {
      console.error('Error getting gas price', e);
      setResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const addEthereumChain = () => {
    if (!provider) {
      throw new Error(`invalid ethereum provider`);
    }

    provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: '0x89',
          chainName: 'Polygon',
          blockExplorerUrls: ['https://polygonscan.com'],
          nativeCurrency: { symbol: 'MATIC', decimals: 18 },
          rpcUrls: ['https://polygon-rpc.com/'],
        },
      ],
    });
  };

  const sendTransaction = async () => {
    if (!accounts[0]) {
      setResponse('No account available');
      return;
    }
    const to = '0x0000000000000000000000000000000000000000';
    const transactionParameters = {
      to, // Required except during contract publications.
      from: accounts[0], // must match user's active address.
      value: '0x5AF3107A4000', // Only required to send ether to the recipient from the initiating external account.
    };
    console.log('transactionParameters', transactionParameters);

    try {
      // txHash is a hex string
      // As with any RPC call, it may throw an error
      const txHash = (await provider?.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      })) as string;

      setResponse(txHash);
    } catch (e) {
      console.log(e);
      setResponse(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const eth_signTypedData_v4 = async () => {
    if (!provider) {
      setResponse(`invalid ethereum provider`);
      return;
    }
    const result = await send_eth_signTypedData_v4(
      provider,
      sdk?.selectedChainId ?? '',
    );
    setResponse(result as string);
  };

  const eth_personal_sign = async () => {
    if (!provider) {
      setResponse(`invalid ethereum provider`);
      return;
    }
    const result = await send_personal_sign(provider);
    setResponse(result as string);
  };

  const changeNetwork = async (hexChainId: string) => {
    console.debug(`switching to network chainId=${hexChainId}`);
    try {
      const response = await provider?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }], // chainId must be in hexadecimal numbers
      });
      console.debug(`response`, response);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div data-testid={TEST_IDS.legacyEvm.card} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 data-testid={TEST_IDS.legacyEvm.title} className="text-lg font-semibold text-gray-800 truncate">
          Legacy EVM Connection
        </h3>
        <button
          type="button"
          onClick={disconnect}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
        >
          Disconnect
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span data-testid={TEST_IDS.legacyEvm.chainIdLabel} className="text-sm font-medium text-gray-600">
            Connected Chain:
          </span>
          <span data-testid={TEST_IDS.legacyEvm.chainIdValue} className="text-sm text-gray-500 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
            {chainId || 'Not available'}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span data-testid={TEST_IDS.legacyEvm.accountsLabel} className="text-sm font-medium text-gray-600">Accounts:</span>
          <span data-testid={TEST_IDS.legacyEvm.accountsValue} className="text-sm text-gray-500 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
            {accounts.length} available
          </span>
        </div>

        {accounts.length > 0 && (
          <div data-testid={TEST_IDS.legacyEvm.activeAccount} className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800 font-medium">Active Account:</p>
            <p className="text-sm text-green-700 font-mono break-all">
              {accounts[0]}
            </p>
          </div>
        )}
      </div>

      {response && (
        <div data-testid={TEST_IDS.legacyEvm.responseContainer} className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p data-testid={TEST_IDS.legacyEvm.responseLabel} className="text-sm font-medium text-gray-600 mb-1">
            Last Response:
          </p>
          <p data-testid={TEST_IDS.legacyEvm.responseText} className="text-sm text-gray-700 font-mono break-all">
            {String(response)}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <button
          type="button"
          data-testid={TEST_IDS.legacyEvm.btnRequestPermissions}
          onClick={requestPermissions}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
        >
          wallet_requestPermissions
        </button>

        <button
          type="button"
          data-testid={TEST_IDS.legacyEvm.btnSignTypedDataV4}
          onClick={eth_signTypedData_v4}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
        >
          eth_signTypedData_v4
        </button>

        <button
          type="button"
          data-testid={TEST_IDS.legacyEvm.btnPersonalSign}
          onClick={eth_personal_sign}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
        >
          personal_sign
        </button>

        <button
          type="button"
          data-testid={TEST_IDS.legacyEvm.btnSendTransaction}
          onClick={sendTransaction}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
        >
          Send transaction
        </button>

        {chainId === '0x1' ? (
          <button
            type="button"
            data-testid={TEST_IDS.legacyEvm.btnSwitchToGoerli}
            onClick={() => changeNetwork('0x5')}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Switch to Goerli
          </button>
        ) : (
          <button
            type="button"
            data-testid={TEST_IDS.legacyEvm.btnSwitchToMainnet}
            onClick={() => changeNetwork('0x1')}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Switch to Mainnet
          </button>
        )}

        <button
          type="button"
          data-testid={TEST_IDS.legacyEvm.btnSwitchToPolygon}
          onClick={() => changeNetwork('0x89')}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
        >
          Switch to Polygon
        </button>

        <button
          type="button"
          data-testid={TEST_IDS.legacyEvm.btnAddPolygonChain}
          onClick={addEthereumChain}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
        >
          Add Polygon Chain
        </button>

        <div data-testid={TEST_IDS.legacyEvm.readOnlySection} className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Read-Only RPC Calls
          </h4>
          <div className="space-y-2">
            <button
              type="button"
              data-testid={TEST_IDS.legacyEvm.btnGetBalance}
              onClick={eth_getBalance}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600 transition-colors"
            >
              eth_getBalance
            </button>
            <button
              type="button"
              data-testid={TEST_IDS.legacyEvm.btnBlockNumber}
              onClick={eth_blockNumber}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600 transition-colors"
            >
              eth_blockNumber
            </button>
            <button
              type="button"
              data-testid={TEST_IDS.legacyEvm.btnGasPrice}
              onClick={eth_gasPrice}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600 transition-colors"
            >
              eth_gasPrice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
