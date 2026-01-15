import { useState, type FormEvent } from 'react';
import { formatEther, type Hex, parseEther } from 'viem';
import {
  type BaseError,
  useAccount,
  useBalance,
  useBlockNumber,
  useChainId,
  useConnectorClient,
  useSendTransaction,
  useSignMessage,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from 'wagmi';

export function WagmiCard() {
  const account = useAccount();
  const chainId = useChainId();
  const { chains, switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address: account.address });
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { data: connectorClient } = useConnectorClient();
  const { signMessage, data: signData } = useSignMessage();
  const {
    data: hash,
    error: sendError,
    isPending: isSending,
    sendTransaction,
  } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const [message, setMessage] = useState('');
  const [sendToAddress, setSendToAddress] = useState('');
  const [sendValue, setSendValue] = useState('');

  const handleSignMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (message) {
      signMessage({ message });
    }
  };

  const handleSendTransaction = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sendToAddress && sendValue) {
      sendTransaction({
        to: sendToAddress as Hex,
        value: parseEther(sendValue),
      });
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 truncate">
          Wagmi Connection
        </h3>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-600">
            Connected Chain:
          </span>
          <span className="text-sm text-gray-500 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
            {chainId || 'Not available'}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-600">Account:</span>
          <span className="text-sm text-gray-500 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
            {account.address ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {account.address && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800 font-medium">Active Account:</p>
            <p className="text-sm text-green-700 font-mono break-all">
              {account.address}
            </p>
          </div>
        )}

        {balance && (
          <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
            <p className="text-sm text-purple-800 font-medium">Balance:</p>
            <p className="text-sm text-purple-700 font-mono">
              {formatEther(balance.value)} {balance.symbol}
            </p>
          </div>
        )}

        {blockNumber && (
          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-800 font-medium">Block Number:</p>
            <p className="text-sm text-gray-700 font-mono">
              {blockNumber.toString()}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Switch Chain
          </h4>
          <div className="space-y-2">
            {chains.map((chain) => (
              <button
                key={chain.id}
                type="button"
                disabled={chainId === chain.id}
                onClick={() => switchChain({ chainId: chain.id })}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {chain.name} {chainId === chain.id && '(Current)'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Sign Message
          </h4>
          <form onSubmit={handleSignMessage} className="space-y-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message to sign"
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
            <button
              type="submit"
              disabled={!message}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Sign Message
            </button>
          </form>
          {signData && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs font-mono break-all">
              Signature: {signData}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Send Transaction
          </h4>
          <form onSubmit={handleSendTransaction} className="space-y-2">
            <input
              type="text"
              value={sendToAddress}
              onChange={(e) => setSendToAddress(e.target.value)}
              placeholder="To address (0x...)"
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
            <input
              type="text"
              value={sendValue}
              onChange={(e) => setSendValue(e.target.value)}
              placeholder="Amount (ETH)"
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
            <button
              type="submit"
              disabled={isSending || !sendToAddress || !sendValue}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending...' : 'Send Transaction'}
            </button>
          </form>
          {hash && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs font-mono break-all">
              Transaction Hash: {hash}
            </div>
          )}
          {isConfirming && (
            <div className="mt-2 text-xs text-blue-600">Waiting for confirmation...</div>
          )}
          {isConfirmed && (
            <div className="mt-2 text-xs text-green-600">Transaction confirmed!</div>
          )}
          {sendError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              Error: {(sendError as BaseError).shortMessage || sendError.message}
            </div>
          )}
        </div>

        {connectorClient && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Connector Client Info
            </h4>
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
              <p>Account: {connectorClient.account?.address}</p>
              <p>Chain ID: {connectorClient.chain?.id}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
