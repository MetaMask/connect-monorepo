import { useEffect, useState } from 'react';
import {
  MetamaskConnectEVM,
  createMetamaskConnectEVM,
} from '@metamask/connect-evm';
import './App.css';
import { send_eth_signTypedData_v4, send_personal_sign } from './SignHelpers';
import type { EIP1193Provider } from '@metamask/connect-evm';
import { getInfuraRpcUrls } from '@metamask/connect-multichain';

function useSDK() {
  const [sdk, setSDK] = useState<MetamaskConnectEVM>();
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState<EIP1193Provider>();
  const [chainId, setChainId] = useState<string>();
  const [accounts, setAccounts] = useState<string[]>([]);

  useEffect(() => {
    const setupSDK = async () => {
      const infuraApiKey = import.meta.env.VITE_INFURA_API_KEY || '';
      const readOnlyRpcMap = infuraApiKey
        ? getInfuraRpcUrls(infuraApiKey)
        : {
            // Fallback public RPC endpoints if no Infura key is provided
            'eip155:1': 'https://eth.llamarpc.com',
            'eip155:5': 'https://goerli.infura.io/v3/demo',
            'eip155:11155111': 'https://sepolia.infura.io/v3/demo',
            'eip155:137': 'https://polygon-rpc.com',
          };

      const clientSDK = await createMetamaskConnectEVM({
        dapp: {
          name: 'NEXTJS demo',
          url: 'https://localhost:3000',
        },
        api: {
          readonlyRPCMap: readOnlyRpcMap,
        },
      });
      const provider = await clientSDK.getProvider();

      if (provider) {
        provider.on('connect', () => {
          setConnected(true);
        });

        provider.on('disconnect', () => {
          setConnected(false);
        });

        provider.on('chainChanged', (chainId: string) => {
          setChainId(chainId);
        });

        provider.on('accountsChanged', (accounts: string[]) => {
          setAccounts(accounts);
        });

        setSDK(clientSDK);
        setProvider(provider);
      }
    };

    if (!sdk) {
      setupSDK();
    }
  }, [sdk]);

  return { sdk, connected, provider, chainId, accounts };
}

export const App = () => {
  const [response, setResponse] = useState<unknown>('');
  const { sdk, connected, provider, chainId, accounts } =
    useSDK();

  // TODO: Do we need language support?
  // const languages = sdk?.availableLanguages ?? ['en'];

  // const [currentLanguage, setCurrentLanguage] = useState(
  //   localStorage.getItem('MetaMaskSDKLng') || 'en',
  // );

  // const changeLanguage = async (currentLanguage: string) => {
  //   localStorage.setItem('MetaMaskSDKLng', currentLanguage);
  //   window.location.reload();
  // };

  // const handleLanguageChange = (
  //   event: React.ChangeEvent<HTMLSelectElement>,
  // ) => {
  //   setCurrentLanguage(event.target.value);

  //   changeLanguage(event.target.value).then(() => {
  //     console.debug(`language changed to ${event.target.value}`);
  //   });
  // };

  const connectAndSign = async () => {
    try {
      const signResult = await sdk?.connectAndSign('Connect + Sign message');
      setResponse(signResult);
    } catch (err) {
      console.warn(`failed to connect...`, err);
    }
  };

  const connect = async () => {
    try {
      const response = await sdk?.connect();
      console.log('connect response', response);
    } catch (err) {
      console.warn(`failed to connect...`, err);
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

    provider
      .request({
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
      })
  };

  const sendTransaction = async () => {
    const to = '0x0000000000000000000000000000000000000000';
    const transactionParameters = {
      to, // Required except during contract publications.
      from: sdk?.selectedAccount, // must match user's active address.
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
    setResponse(result);
  };

  const eth_personal_sign = async () => {
    if (!provider) {
      setResponse(`invalid ethereum provider`);
      return;
    }
    const result = await send_personal_sign(provider);
    setResponse(result);
  };

  const terminate = () => {
    sdk?.disconnect();
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
    <div className="App">
      <h1>Vite React MMSDK Example</h1>
      <div className={'Info-Status'}>
        <p id='connected-chain'>{`Connected chain: ${chainId}`}</p>
        <p id='connected-accounts'>{`Connected accounts: ${accounts}`}</p>
        <p id='request-response'>{`Last request response: ${response}`}</p>
        <p id='connected-status'>{`Connected: ${connected}`}</p>
      </div>

      {/* <div className="language-dropdown">
        <label htmlFor="language-select">Language: </label>
        <select
          id="language-select"
          value={currentLanguage}
          onChange={handleLanguageChange}
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div> */}

      {connected ? (
        <div>
          <button
            className={'Button-Normal'}
            style={{ padding: 10, margin: 10 }}
            onClick={connect}
            id='request-accounts-button'
          >
            Request Accounts
          </button>

          <button
            className={'Button-Normal'}
            style={{ padding: 10, margin: 10 }}
            onClick={eth_signTypedData_v4}
          >
            eth_signTypedData_v4
          </button>

          <button
            className={'Button-Normal'}
            style={{ padding: 10, margin: 10 }}
            onClick={eth_personal_sign}
            id='personal-sign-button'
          >
            personal_sign
          </button>

          <button
            className={'Button-Normal'}
            style={{ padding: 10, margin: 10 }}
            onClick={sendTransaction}
            id='send-transaction-button'
          >
            Send transaction
          </button>

          {chainId === '1' ? (
            <button
              className={'Button-Normal'}
              style={{ padding: 10, margin: 10 }}
              onClick={() => changeNetwork('0x5')}
              id='switch-to-goerli-button'
            >
              Switch to Goerli
            </button>
          ) : (
            <button
              className={'Button-Normal'}
              style={{ padding: 10, margin: 10 }}
              onClick={() => changeNetwork('0x1')}
              id='switch-to-mainnet-button'
            >
              Switch to Mainnet
            </button>
          )}

          <button
            className={'Button-Normal'}
            style={{ padding: 10, margin: 10 }}
            onClick={() => changeNetwork('0x89')}
            id='switch-to-polygon-button'
          >
            Switch to Polygon
          </button>

          <button
            className={'Button-Normal'}
            style={{ padding: 10, margin: 10 }}
            onClick={addEthereumChain}
            id='add-polygon-chain-button'
          >
            Add Polygon Chain
          </button>

          <div style={{ marginTop: 20, borderTop: '1px solid #ccc', paddingTop: 10 }}>
            <h3>Read-Only RPC Calls</h3>
            <button
              className={'Button-Normal'}
              style={{ padding: 10, margin: 10 }}
              onClick={eth_getBalance}
              id='eth-get-balance-button'
            >
              eth_getBalance
            </button>
            <button
              className={'Button-Normal'}
              style={{ padding: 10, margin: 10 }}
              onClick={eth_blockNumber}
              id='eth-block-number-button'
            >
              eth_blockNumber
            </button>
            <button
              className={'Button-Normal'}
              style={{ padding: 10, margin: 10 }}
              onClick={eth_gasPrice}
              id='eth-gas-price-button'
            >
              eth_gasPrice
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            className={'Button-Normal'}
            style={{ padding: 10, margin: 10 }}
            onClick={connect}
            id='connect-button'
          >
            Connect
          </button>
          <button
            className={'Button-Normal'}
            style={{ padding: 10, margin: 10 }}
            onClick={connectAndSign}
            id='connect-and-sign-button'
          >
            Connect w/ Sign
          </button>
        </div>
      )}

      <button
        className={'Button-Danger'}
        style={{ padding: 10, margin: 10 }}
        onClick={terminate}
        id='terminate-button'
      >
        Terminate
      </button>
    </div>
  );
};

export default App;
