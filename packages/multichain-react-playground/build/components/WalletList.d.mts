export type WalletMapEntry = {
    params: {
        name: string;
        uuid: string;
        rdns: string;
        icon: string;
        extensionId?: string;
    };
};
type WalletListProps = {
    wallets: Record<string, WalletMapEntry>;
    handleClick: (extensionId: string) => Promise<void>;
    connectedExtensionId: string;
};
declare function WalletList({ wallets, handleClick, connectedExtensionId }: WalletListProps): import("react/jsx-runtime").JSX.Element;
export default WalletList;
//# sourceMappingURL=WalletList.d.mts.map