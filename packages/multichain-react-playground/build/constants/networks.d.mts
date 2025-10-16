import type { CaipChainId } from "@metamask/utils";
export declare const FEATURED_NETWORKS: {
    readonly 'Ethereum Mainnet': "eip155:1";
    readonly 'Linea Mainnet': "eip155:59144";
    readonly 'Arbitrum One': "eip155:42161";
    readonly 'Avalanche Network C-Chain': "eip155:43114";
    readonly 'BNB Chain': "eip155:56";
    readonly 'OP Mainnet': "eip155:10";
    readonly 'Polygon Mainnet': "eip155:137";
    readonly 'zkSync Era Mainnet': "eip155:324";
    readonly 'Base Mainnet': "eip155:8453";
    readonly 'Solana Mainnet': "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
};
export declare const getNetworkName: (chainId: CaipChainId) => string;
//# sourceMappingURL=networks.d.mts.map