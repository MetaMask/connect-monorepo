/* c8 ignore start */
import type { RpcUrlsMap } from './types';

export const infuraRpcUrls: RpcUrlsMap = {
  // ###### Ethereum ######
  // Mainnet
  'eip155:1': 'https://mainnet.infura.io/v3/',
  // Sepolia 11155111
  'eip155:11155111': 'https://sepolia.infura.io/v3/',
  // Hoodi
  'eip155:560048': 'https://hoodi.infura.io/v3/',
  // ###### Linea ######
  // Mainnet Alpha
  'eip155:59144': 'https://linea-mainnet.infura.io/v3/',
  // Sepolia
  'eip155:59141': 'https://linea-sepolia.infura.io/v3/',
  // ###### Polygon ######
  // Mainnet
  'eip155:137': 'https://polygon-mainnet.infura.io/v3/',
  // Amoy
  'eip155:80002': 'https://polygon-amoy.infura.io/v3/',
  // ###### Optimism ######
  // Mainnet
  'eip155:10': 'https://optimism-mainnet.infura.io/v3/',
  // Sepolia
  'eip155:11155420': 'https://optimism-sepolia.infura.io/v3/',
  // ###### Arbitrum ######
  // Mainnet
  'eip155:42161': 'https://arbitrum-mainnet.infura.io/v3/',
  // Sepolia
  'eip155:421614': 'https://arbitrum-sepolia.infura.io/v3/',
  // ###### Base ######
  // Mainnet
  'eip155:8453': 'https://base-mainnet.infura.io/v3/',
  // Sepolia
  'eip155:84532': 'https://base-sepolia.infura.io/v3/',
  // ###### Blast ######
  // Mainnet
  'eip155:81457': 'https://blast-mainnet.infura.io/v3/',
  // Sepolia
  'eip155:168587773': 'https://blast-sepolia.infura.io/v3/',
  // ###### zkSync ######
  // Mainnet
  'eip155:324': 'https://zksync-mainnet.infura.io/v3/',
  // Sepolia
  'eip155:300': 'https://zksync-sepolia.infura.io/v3/',
  // ###### BSC ######
  // Mainnet
  'eip155:56': 'https://bsc-mainnet.infura.io/v3/',
  // Testnet
  'eip155:97': 'https://bsc-testnet.infura.io/v3/',
  // ###### opBNB ######
  // Mainnet
  'eip155:204': 'https://opbnb-mainnet.infura.io/v3/',
  // Testnet
  'eip155:5611': 'https://opbnb-testnet.infura.io/v3/',
  // ###### Scroll ######
  // Mainnet
  'eip155:534352': 'https://scroll-mainnet.infura.io/v3/',
  // Sepolia
  'eip155:534351': 'https://scroll-sepolia.infura.io/v3/',
  // ###### Mantle ######
  // Mainnet
  'eip155:5000': 'https://mantle-mainnet.infura.io/v3/',
  // Sepolia
  'eip155:5003': 'https://mantle-sepolia.infura.io/v3/',
  // ###### Sei ######
  // Mainnet
  'eip155:1329': 'https://sei-mainnet.infura.io/v3/',
  // Testnet
  'eip155:713715': 'https://sei-testnet.infura.io/v3/',
  // ###### Swellchain ######
  // Mainnet
  'eip155:1923': 'https://swellchain-mainnet.infura.io/v3/',
  // Testnet
  'eip155:1924': 'https://swellchain-testnet.infura.io/v3/',
  // ###### Unichain ######
  // Mainnet
  'eip155:130': 'https://unichain-mainnet.infura.io/v3/',
  // Sepolia
  'eip155:1301': 'https://unichain-sepolia.infura.io/v3/',
  // ###### Hemi ######
  // Mainnet
  'eip155:43111': 'https://hemi-mainnet.infura.io/v3/',
  // Testnet
  'eip155:743111': 'https://hemi-testnet.infura.io/v3/',
  // ###### MegaETH ######
  // Mainnet
  'eip155:6342': 'https://megaeth-mainnet.infura.io/v3/',
  // Testnet
  'eip155:6342001': 'https://megaeth-testnet.infura.io/v3/',
  // ###### Monad ######
  // Mainnet
  'eip155:143': 'https://monad-mainnet.infura.io/v3/',
  // Testnet
  'eip155:10143': 'https://monad-testnet.infura.io/v3/',
  // ###### Palm ######
  // Mainnet
  'eip155:11297108109': 'https://palm-mainnet.infura.io/v3/',
  // ###### Avalanche C-Chain ######
  // Mainnet
  'eip155:43114': 'https://avalanche-mainnet.infura.io/v3/',
  // Fuji
  'eip155:43113': 'https://avalanche-fuji.infura.io/v3/',
  // // ###### NEAR ######
  // // Mainnet
  // 'near:mainnet': `https://near-mainnet.infura.io/v3/`,
  // // Testnet
  // 'near:testnet': `https://near-testnet.infura.io/v3/`,
  // ###### StarkNet ######
  // Mainnet
  //
  // 'starknet:SN_MAIN': `https://starknet-mainnet.infura.io/v3/`,
  // // Goerli
  // 'starknet:SN_GOERLI': `https://starknet-goerli.infura.io/v3/`,
  // // Goerli 2
  // 'starknet:SN_GOERLI2': `https://starknet-goerli2.infura.io/v3/`,
  // ###### Celo ######
  // Mainnet
  'eip155:42220': 'https://celo-mainnet.infura.io/v3/',
  // Sepolia
  'eip155:44787': 'https://celo-sepolia.infura.io/v3/',
  // ###### Solana ######
  // Mainnet
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp':
    'https://solana-mainnet.infura.io/v3/',
  // Devnet
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1':
    'https://solana-devnet.infura.io/v3/',
};

// Methods that are passed through to the RPC node
export const RPC_HANDLED_METHODS = new Set([
  'eth_blockNumber',
  'eth_gasPrice',
  'eth_maxPriorityFeePerGas',
  'eth_blobBaseFee',
  'eth_feeHistory',
  'eth_getBalance',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_call',
  'eth_estimateGas',
  'eth_getLogs',
  'eth_getProof',
  'eth_getTransactionCount',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getUncleCountByBlockNumber',
  'eth_getUncleCountByBlockHash',
  'eth_getTransactionByHash',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionReceipt',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getFilterChanges',
  'eth_getFilterLogs',
  'eth_newBlockFilter',
  'eth_newFilter',
  'eth_newPendingTransactionFilter',
  'eth_sendRawTransaction',
  'eth_syncing',
  'eth_uninstallFilter',
]);

// Methods that are handled by the SDK directly
export const SDK_HANDLED_METHODS = new Set(['eth_accounts', 'eth_chainId']);
