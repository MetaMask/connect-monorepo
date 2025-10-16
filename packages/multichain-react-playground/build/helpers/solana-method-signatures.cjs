"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSolanaMethodExamples = void 0;
const web3_js_1 = require("@solana/web3.js");
const networks_1 = require("../constants/networks.cjs");
const SOLANA_RPC_CONFIG = {
    endpoints: [
        ...(process.env.REACT_APP_HELIUS_API_KEY ? [`https://api.helius-rpc.com/?api-key=${process.env.REACT_APP_HELIUS_API_KEY}`] : []),
        'https://api.devnet.solana.com',
        'https://api.mainnet-beta.solana.com',
    ],
    commitment: 'confirmed',
    fallbackBlockhash: 'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k',
};
const generateBase64Transaction = async (address) => {
    const publicKey = new web3_js_1.PublicKey(address);
    // biome-ignore lint/suspicious/noExplicitAny: Needed
    let blockhash;
    // biome-ignore lint/suspicious/noExplicitAny: Needed
    let error;
    for (const endpoint of SOLANA_RPC_CONFIG.endpoints) {
        try {
            const connection = new web3_js_1.Connection(endpoint, SOLANA_RPC_CONFIG.commitment);
            const response = await connection.getLatestBlockhash();
            blockhash = response.blockhash;
            console.log(`Successfully connected to Solana RPC endpoint`);
            break;
        }
        catch (connectionError) {
            console.error(`Failed to connect to RPC endpoint:`, connectionError);
            error = connectionError;
        }
    }
    if (!blockhash) {
        console.warn('All RPC endpoints failed, using fallback blockhash');
        blockhash = SOLANA_RPC_CONFIG.fallbackBlockhash;
        console.error('Original error:', error);
    }
    const transaction = new web3_js_1.Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;
    transaction.add(web3_js_1.SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: publicKey,
        lamports: 1000,
    }));
    const serializedTransaction = transaction.serialize({
        verifySignatures: false,
    });
    // Convert Uint8Array to base64 safely to avoid call stack overflow
    const uint8Array = new Uint8Array(serializedTransaction);
    let binaryString = '';
    const chunkSize = 2048; // Process in chunks to avoid call stack limits
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Transaction = btoa(binaryString);
    return base64Transaction;
};
const stringToBase64 = (str) => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    return btoa(String.fromCharCode.apply(null, [...bytes]));
};
const generateSolanaMethodExamples = async (method, address) => {
    switch (method) {
        case 'signMessage':
            return {
                params: {
                    account: { address },
                    message: stringToBase64('Hello, world!'),
                },
            };
        case 'signTransaction':
            return {
                params: {
                    account: { address },
                    transaction: await generateBase64Transaction(address),
                    scope: networks_1.FEATURED_NETWORKS['Solana Mainnet'],
                },
            };
        case 'signAllTransactions':
            return {
                params: {
                    account: { address },
                    transactions: [await generateBase64Transaction(address), await generateBase64Transaction(address)],
                    scope: networks_1.FEATURED_NETWORKS['Solana Mainnet'],
                },
            };
        case 'signAndSendTransaction':
            return {
                params: {
                    account: { address },
                    transaction: await generateBase64Transaction(address),
                    scope: networks_1.FEATURED_NETWORKS['Solana Mainnet'],
                },
            };
        case 'signIn':
            return {
                params: {
                    address,
                    domain: window.location.host,
                    statement: 'Please sign in.',
                },
            };
        case 'getGenesisHash':
            return {
                params: {},
            };
        default:
            return {};
    }
};
exports.generateSolanaMethodExamples = generateSolanaMethodExamples;
//# sourceMappingURL=solana-method-signatures.cjs.map