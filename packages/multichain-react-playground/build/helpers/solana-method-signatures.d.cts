export declare const generateSolanaMethodExamples: (method: string, address: string) => Promise<{
    params: {
        account: {
            address: string;
        };
        message: string;
        transaction?: undefined;
        scope?: undefined;
        transactions?: undefined;
        address?: undefined;
        domain?: undefined;
        statement?: undefined;
    };
} | {
    params: {
        account: {
            address: string;
        };
        transaction: string;
        scope: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
        message?: undefined;
        transactions?: undefined;
        address?: undefined;
        domain?: undefined;
        statement?: undefined;
    };
} | {
    params: {
        account: {
            address: string;
        };
        transactions: string[];
        scope: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
        message?: undefined;
        transaction?: undefined;
        address?: undefined;
        domain?: undefined;
        statement?: undefined;
    };
} | {
    params: {
        address: string;
        domain: string;
        statement: string;
        account?: undefined;
        message?: undefined;
        transaction?: undefined;
        scope?: undefined;
        transactions?: undefined;
    };
} | {
    params: {
        account?: undefined;
        message?: undefined;
        transaction?: undefined;
        scope?: undefined;
        transactions?: undefined;
        address?: undefined;
        domain?: undefined;
        statement?: undefined;
    };
} | {
    params?: undefined;
}>;
//# sourceMappingURL=solana-method-signatures.d.cts.map