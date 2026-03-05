import { useBitcoin } from '../sdk/BitcoinProvider';
import { useCallback, useState } from 'react';
import { TEST_IDS } from '@metamask/playground-ui';

export const BitcoinWalletCard: React.FC = () => {
  const {
    connected,
    selectedAccount,
    disconnect,
    signMessage,
    sendPayment,
    signPsbt,
  } = useBitcoin();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Hello from MetaMask Connect!');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [rawPsbt, setRawPsbt] = useState('');
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [signedPsbt, setSignedPsbt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignMessage = useCallback(async () => {
    if (!selectedAccount || !signMessage) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const encoded = new TextEncoder().encode(message);
      const signature = await signMessage(encoded);
      setSignedMessage(Buffer.from(signature).toString('base64'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign message');
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, signMessage, message]);

  const handleSendPayment = useCallback(async () => {
    if (!selectedAccount) {
      throw new Error('Account not selected');
    }

    setLoading(true);
    setError(null);

    try {
      const txId = await sendPayment(recipientAddress, 400n);
      setTxId(txId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send payment');
    } finally {
      setLoading(false);
    }
  }, [setTxId, recipientAddress, selectedAccount, sendPayment]);

  const handleSignPsbt = useCallback(async () => {
    if (!selectedAccount || !signPsbt) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const signedPsbt = await signPsbt(rawPsbt, []);
      setSignedPsbt(signedPsbt.psbtBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign PSBT');
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, signPsbt, rawPsbt]);

  return (
    <div data-testid={TEST_IDS.bitcoin.card} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 data-testid={TEST_IDS.bitcoin.title} className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-2xl">₿</span>
          Bitcoin Wallet
        </h3>
        {connected && (
          <button
            type="button"
            data-testid={TEST_IDS.bitcoin.btnDisconnect}
            onClick={disconnect}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <div data-testid={TEST_IDS.bitcoin.status} className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          <span className="text-sm text-gray-600">
            {connected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {/* Wallet Address */}
        {selectedAccount && (
          <div data-testid={TEST_IDS.bitcoin.addressContainer} className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500 mb-1">Address</p>
            <p className="text-sm font-mono break-all">{selectedAccount.address}</p>
          </div>
        )}

        {/* Sign Message Section */}
        {connected && (
          <div data-testid={TEST_IDS.bitcoin.signMessageSection} className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Sign Message
            </h4>
            <input
              type="text"
              data-testid={TEST_IDS.bitcoin.inputMessage}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
              placeholder="Enter message to sign"
            />
            <button
              type="button"
              data-testid={TEST_IDS.bitcoin.btnSignMessage}
              onClick={handleSignMessage}
              disabled={loading || !signMessage}
              className="bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing...' : 'Sign Message'}
            </button>

            {signedMessage && (
              <div data-testid={TEST_IDS.bitcoin.signedMessageResult} className="mt-3 bg-green-50 rounded p-3">
                <p className="text-xs text-green-700 mb-1">Signed Message</p>
                <p className="text-xs font-mono break-all text-green-800">
                  {signedMessage}
                </p>
              </div>
            )}
          </div>
        )}
        

        {/* Send Payment Section */}
        {connected && (
          <div data-testid={TEST_IDS.bitcoin.transactionsSection} className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Send Payment
            </h4>
            <input
              type="text"
              data-testid={TEST_IDS.bitcoin.inputRecipientAddress}
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
              placeholder="Enter recipient address"
            />
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                data-testid={TEST_IDS.bitcoin.btnSendPayment}
                onClick={handleSendPayment}
                disabled={loading}
                className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Payment'}
              </button>
            </div>

            {txId && (
              <div data-testid={TEST_IDS.bitcoin.txIdResult} className="mt-3 bg-blue-50 rounded p-3">
                <p className="text-xs text-blue-700 mb-1">Transaction ID</p>
                <p className="text-xs font-mono break-all text-blue-800">
                  {txId}
                </p>
              </div>
            )}
          </div>
        )}

        {/* PSBT Section */}
        {connected && (
          <div data-testid={TEST_IDS.bitcoin.psbtSection} className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Sign PSBT
            </h4>

            <input
              type="text"
              data-testid={TEST_IDS.bitcoin.inputPsbt}
              value={rawPsbt}
              onChange={(e) => setRawPsbt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2 mt-2"
              placeholder="Enter raw PSBT"
            />

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                data-testid={TEST_IDS.bitcoin.btnSignPsbt}
                onClick={handleSignPsbt}
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing...' : 'Sign PSBT'}
              </button>
            </div>

            {signedPsbt && (
              <div data-testid={TEST_IDS.bitcoin.psbtSignatureResult} className="mt-3 bg-blue-50 rounded p-3">
                <p className="text-xs text-blue-700 mb-1">Signed PSBT</p>
                <p className="text-xs font-mono break-all text-blue-800">
                  {signedPsbt}
                </p>
              </div>
            )}
          </div>
        )}
        

        {/* Error Display */}
        {error && (
          <div data-testid={TEST_IDS.bitcoin.errorContainer} className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};