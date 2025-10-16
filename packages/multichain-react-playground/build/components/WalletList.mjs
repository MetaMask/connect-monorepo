import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { WINDOW_POST_MESSAGE_ID } from "../constants/index.mjs";
function WalletList({ wallets, handleClick, connectedExtensionId }) {
    const handleWalletClick = (extensionId) => (ev) => {
        ev.preventDefault();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        handleClick(extensionId);
    };
    if (Object.keys(wallets).length === 0) {
        return _jsx("p", { className: "text-gray-600 text-center py-8", children: "No wallets detected" });
    }
    return (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5", children: Object.values(wallets).map((wallet) => {
            const isConnected = wallet.params.extensionId === connectedExtensionId;
            return (_jsxs("div", { className: "bg-gray-100 rounded-lg p-5 flex flex-col items-center shadow-sm", children: [_jsx("img", { src: wallet.params.icon, alt: `${wallet.params.name} icon`, className: "w-12 h-12 rounded-full mb-4" }), _jsxs("div", { className: "flex flex-col items-center text-center w-full", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800 mb-2", children: wallet.params.name }), _jsxs("p", { className: "text-sm text-gray-600 mb-1", children: ["UUID: ", wallet.params.uuid] }), _jsxs("p", { className: "text-sm text-gray-600 mb-1", children: ["RDNS: ", wallet.params.rdns] }), wallet.params.extensionId && (_jsxs(_Fragment, { children: [_jsxs("p", { className: "text-sm text-gray-600 mb-4", children: [wallet.params.extensionId === WINDOW_POST_MESSAGE_ID ? null : 'Extension ID: ', wallet.params.extensionId] }), _jsx("button", { type: "button", onClick: handleWalletClick(wallet.params.extensionId), disabled: isConnected, className: "w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-70", children: isConnected ? 'Connected' : 'Connect' })] }))] })] }, wallet.params.uuid));
        }) }));
}
export default WalletList;
//# sourceMappingURL=WalletList.mjs.map