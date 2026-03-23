import { uint8ArrayToBase64 } from '@metamask/playground-ui/config';
import {
  useWalletSession,
  useDisconnectWallet,
  useSolanaClient,
} from '@solana/react-hooks';
import {
  address,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  compileTransaction,
  createNoopSigner,
  type Transaction,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { useCallback, useState } from 'react';
import { TEST_IDS } from '@metamask/playground-ui';

type SolanaClient = ReturnType<typeof useSolanaClient>;

async function buildTestTransaction(
  publicKey: string,
  client: SolanaClient,
): Promise<Transaction> {
  // Blockhash is fetched at build time; transactions expire after ~90 seconds
  // (lastValidBlockHeight). This is acceptable for a playground with no retry logic.
  const {
    value: { blockhash, lastValidBlockHeight },
  } = await client.runtime.rpc.getLatestBlockhash().send();

  const senderAddress = address(publicKey);
  const signer = createNoopSigner(senderAddress);

  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash, lastValidBlockHeight },
        tx,
      ),
    (tx) =>
      appendTransactionMessageInstruction(
        getTransferSolInstruction({
          source: signer,
          destination: senderAddress,
          amount: BigInt(0),
        }),
        tx,
      ),
  );

  return compileTransaction(txMessage);
}

/**
 * SolanaWalletCard component displays Solana wallet connection status
 * and provides functionality for signing messages and transactions.
 */
export const SolanaWalletCard = () => {
  const session = useWalletSession();
  const disconnect = useDisconnectWallet();
  const client = useSolanaClient();

  const connected = session !== undefined;
  const publicKey = session?.account.address ?? null;

  const [message, setMessage] = useState('Hello from MetaMask Connect!');
  const [signedMessage, setSignedMessage] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<
    string | null
  >(null);
  const [signingMessage, setSigningMessage] = useState(false);
  const [signingTx, setSigningTx] = useState(false);
  const [sendingTx, setSendingTx] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignMessage = useCallback(async () => {
    if (!session || !session.signMessage) {
      setError('Wallet not connected or signMessage not supported');
      return;
    }

    setSigningMessage(true);
    setError(null);
    setSignedMessage(null);

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await session.signMessage(encodedMessage);
      setSignedMessage(uint8ArrayToBase64(signature));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign message');
    } finally {
      setSigningMessage(false);
    }
  }, [session, message]);

  const handleSignTransaction = useCallback(async () => {
    if (!session || !session.signTransaction || !publicKey) {
      setError('Wallet not connected or signTransaction not supported');
      return;
    }

    setSigningTx(true);
    setError(null);
    setTransactionSignature(null);

    try {
      const compiledTx = await buildTestTransaction(publicKey, client);
      // @ts-expect-error - compileTransaction returns an unsigned Transaction; the FullySignedTransaction
      // brand is a kit compile-time constraint, but session.signTransaction accepts it at runtime.
      const signedTx = await session.signTransaction(compiledTx);
      const firstSig = Object.values(signedTx.signatures)[0];
      if (firstSig) {
        setTransactionSignature(uint8ArrayToBase64(firstSig));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to sign transaction',
      );
    } finally {
      setSigningTx(false);
    }
  }, [session, publicKey, client]);

  const handleSendTransaction = useCallback(async () => {
    if (!session || !session.sendTransaction || !publicKey) {
      setError('Wallet not connected or sendTransaction not supported');
      return;
    }

    setSendingTx(true);
    setError(null);
    setTransactionSignature(null);

    try {
      const compiledTx = await buildTestTransaction(publicKey, client);
      // @ts-expect-error - same as above: unsigned Transaction is structurally compatible at runtime.
      const txSignature = await session.sendTransaction(compiledTx);
      setTransactionSignature(txSignature as string); // Signature is a branded base58 string at runtime
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send transaction',
      );
    } finally {
      setSendingTx(false);
    }
  }, [session, publicKey, client]);

  return (
    <div
      data-testid={TEST_IDS.solana.card}
      className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          data-testid={TEST_IDS.solana.title}
          className="text-lg font-semibold text-gray-800 flex items-center gap-2"
        >
          <span className="text-2xl">☀️</span>
          Solana Wallet
        </h3>
        {connected && (
          <button
            type="button"
            data-testid={TEST_IDS.solana.btnDisconnect}
            onClick={disconnect}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <div
          data-testid={TEST_IDS.solana.status}
          className="flex items-center gap-2"
        >
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          <span className="text-sm text-gray-600">
            {connected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {/* Wallet Address */}
        {publicKey && (
          <div
            data-testid={TEST_IDS.solana.addressContainer}
            className="bg-gray-50 rounded p-3"
          >
            <p className="text-xs text-gray-500 mb-1">Address</p>
            <p className="text-sm font-mono break-all">{publicKey}</p>
          </div>
        )}

        {/* Connect Prompt */}
        {!connected && (
          <div
            data-testid={TEST_IDS.solana.btnConnect}
            className="flex gap-2 flex-wrap"
          >
            <p className="text-sm text-gray-500">
              Use the &quot;Connect (Solana)&quot; button above to connect.
            </p>
          </div>
        )}

        {/* Sign Message Section */}
        {connected && (
          <div
            data-testid={TEST_IDS.solana.signMessageSection}
            className="border-t pt-4 mt-4"
          >
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Sign Message
            </h4>
            <input
              type="text"
              data-testid={TEST_IDS.solana.inputMessage}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
              placeholder="Enter message to sign"
            />
            <button
              type="button"
              data-testid={TEST_IDS.solana.btnSignMessage}
              onClick={handleSignMessage}
              disabled={signingMessage || !session?.signMessage}
              className="bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {signingMessage ? 'Signing...' : 'Sign Message'}
            </button>

            {signedMessage && (
              <div
                data-testid={TEST_IDS.solana.signedMessageResult}
                className="mt-3 bg-green-50 rounded p-3"
              >
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
          <div
            data-testid={TEST_IDS.solana.transactionsSection}
            className="border-t pt-4 mt-4"
          >
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Transactions
            </h4>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                data-testid={TEST_IDS.solana.btnSignTransaction}
                onClick={handleSignTransaction}
                disabled={signingTx || sendingTx || !session?.signTransaction}
                className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {signingTx ? 'Signing...' : 'Sign Transaction'}
              </button>
              <button
                type="button"
                data-testid={TEST_IDS.solana.btnSendTransaction}
                onClick={handleSendTransaction}
                disabled={signingTx || sendingTx || !session?.sendTransaction}
                className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {sendingTx ? 'Sending...' : 'Sign & Send'}
              </button>
            </div>

            {transactionSignature && (
              <div
                data-testid={TEST_IDS.solana.transactionSignatureResult}
                className="mt-3 bg-blue-50 rounded p-3"
              >
                <p className="text-xs text-blue-700 mb-1">
                  Transaction Signature
                </p>
                <p className="text-xs font-mono break-all text-blue-800">
                  {transactionSignature}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div
            data-testid={TEST_IDS.solana.errorContainer}
            className="bg-red-50 border border-red-200 rounded p-3"
          >
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
