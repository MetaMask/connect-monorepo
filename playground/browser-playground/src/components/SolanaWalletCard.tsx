import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCallback, useState } from 'react';

/**
 * SolanaWalletCard component displays Solana wallet connection status
 * and provides functionality for signing messages and transactions.
 */
export const SolanaWalletCard: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, connected, disconnect, signMessage, signTransaction, sendTransaction } =
    useWallet();

  const [message, setMessage] = useState('Hello from MetaMask Connect!');
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignMessage = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError('Wallet not connected or signMessage not supported');
      return;
    }

    setLoading(true);
    setError(null);
    setSignedMessage(null);

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      setSignedMessage(Buffer.from(signature).toString('base64'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign message');
    } finally {
      setLoading(false);
    }
  }, [publicKey, signMessage, message]);

  const handleSignTransaction = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected or signTransaction not supported');
      return;
    }

    setLoading(true);
    setError(null);
    setTransactionSignature(null);

    try {
      const { blockhash } = await connection.getLatestBlockhash();

      // Create a simple transfer transaction (to self, 0 SOL)
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0,
        }),
      );

      const signedTx = await signTransaction(transaction);
      const signature = signedTx.signatures[0]?.signature;
      if (signature) {
        setTransactionSignature(Buffer.from(signature).toString('base64'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign transaction');
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, connection]);

  const handleSendTransaction = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      setError('Wallet not connected or sendTransaction not supported');
      return;
    }

    setLoading(true);
    setError(null);
    setTransactionSignature(null);

    try {
      const { blockhash } = await connection.getLatestBlockhash();

      // Create a minimal transfer transaction (to self, minimum rent-exempt amount)
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0,
        }),
      );

      const txSignature = await sendTransaction(transaction, connection);
      setTransactionSignature(txSignature);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, connection]);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-2xl">☀️</span>
          Solana Wallet
        </h3>
        {connected && (
          <button
            type="button"
            onClick={disconnect}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          <span className="text-sm text-gray-600">
            {connected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {/* Wallet Address */}
        {publicKey && (
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500 mb-1">Address</p>
            <p className="text-sm font-mono break-all">{publicKey.toBase58()}</p>
          </div>
        )}

        {/* Wallet Buttons */}
        {!connected && (
          <div className="flex gap-2 flex-wrap">
            <WalletMultiButton className="!bg-blue-500 hover:!bg-blue-600" />
          </div>
        )}

        {/* Sign Message Section */}
        {connected && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Sign Message
            </h4>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
              placeholder="Enter message to sign"
            />
            <button
              type="button"
              onClick={handleSignMessage}
              disabled={loading || !signMessage}
              className="bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing...' : 'Sign Message'}
            </button>

            {signedMessage && (
              <div className="mt-3 bg-green-50 rounded p-3">
                <p className="text-xs text-green-700 mb-1">Signed Message</p>
                <p className="text-xs font-mono break-all text-green-800">
                  {signedMessage}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Transaction Section */}
        {connected && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Transactions
            </h4>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSignTransaction}
                disabled={loading || !signTransaction}
                className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing...' : 'Sign Transaction'}
              </button>
              <button
                type="button"
                onClick={handleSendTransaction}
                disabled={loading || !sendTransaction}
                className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Sign & Send'}
              </button>
            </div>

            {transactionSignature && (
              <div className="mt-3 bg-blue-50 rounded p-3">
                <p className="text-xs text-blue-700 mb-1">Transaction Signature</p>
                <p className="text-xs font-mono break-all text-blue-800">
                  {transactionSignature}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
