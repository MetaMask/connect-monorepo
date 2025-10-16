import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import $react from "react";
const { useState, useEffect, useCallback } = $react;
import { useSDK } from "./sdk/index.mjs";
import DynamicInputs, { INPUT_LABEL_TYPE } from "./components/DynamicInputs.mjs";
import { FEATURED_NETWORKS } from "./constants/networks.mjs";
import { ScopeCard } from "./components/ScopeCard.mjs";
import { Buffer } from "buffer";
global.Buffer = Buffer;
function App() {
    const [customScopes, setCustomScopes] = useState(['eip155:1']);
    const [caipAccountIds, setCaipAccountIds] = useState([]);
    const { error, state, session, connect: sdkConnect, disconnect: sdkDisconnect } = useSDK();
    const handleCheckboxChange = useCallback((value, isChecked) => {
        if (isChecked) {
            setCustomScopes(Array.from(new Set([...customScopes, value])));
        }
        else {
            setCustomScopes(customScopes.filter((item) => item !== value));
        }
    }, [customScopes]);
    useEffect(() => {
        if (session) {
            const scopes = Object.keys(session?.sessionScopes ?? {});
            setCustomScopes(scopes);
            // Accumulate all accounts from all scopes
            const allAccounts = [];
            for (const scope of scopes) {
                const { accounts } = session.sessionScopes?.[scope] ?? {};
                if (accounts && accounts.length > 0) {
                    allAccounts.push(...accounts);
                }
            }
            setCaipAccountIds(allAccounts);
        }
    }, [session]);
    const scopesHaveChanged = useCallback(() => {
        if (!session)
            return false;
        const sessionScopes = Object.keys(session?.sessionScopes ?? {});
        const currentScopes = customScopes.filter((scope) => scope.length);
        if (sessionScopes.length !== currentScopes.length)
            return true;
        return !sessionScopes.every((scope) => currentScopes.includes(scope)) || !currentScopes.every((scope) => sessionScopes.includes(scope));
    }, [session, customScopes]);
    const connect = useCallback(async () => {
        const selectedScopesArray = customScopes.filter((scope) => scope.length);
        const filteredAccountIds = caipAccountIds.filter((addr) => addr.trim() !== '');
        return sdkConnect(selectedScopesArray, filteredAccountIds);
    }, [customScopes, caipAccountIds, sdkConnect]);
    const disconnect = useCallback(async () => {
        await sdkDisconnect();
    }, [sdkDisconnect]);
    const availableOptions = Object.keys(FEATURED_NETWORKS).reduce((all, networkName) => {
        const networkCaipValue = FEATURED_NETWORKS[networkName];
        all.push({ name: networkName, value: networkCaipValue });
        return all;
    }, []);
    const isDisconnected = state === 'disconnected' || state === 'pending' || state === 'loaded';
    const isConnected = state === 'connected';
    const isConnecting = state === 'connecting';
    return (_jsx("div", { className: "min-h-screen bg-gray-50 flex justify-center", children: _jsxs("div", { className: "max-w-6xl w-full p-8", children: [_jsx("h1", { className: "text-slate-800 text-4xl font-bold mb-8 text-center", children: "MetaMask MultiChain API Test Dapp" }), _jsxs("section", { className: "bg-white rounded-lg p-8 mb-6 shadow-sm", children: [_jsx("div", { className: "mb-4", children: _jsx(DynamicInputs, { availableOptions: availableOptions, inputArray: customScopes, handleCheckboxChange: handleCheckboxChange, label: INPUT_LABEL_TYPE.SCOPE }) }), isConnecting && (_jsx("button", { type: "button", onClick: connect, className: "bg-blue-500 text-white px-5 py-2 rounded text-base mr-2 hover:bg-blue-600 transition-colors", children: "Connecting" })), isDisconnected && (_jsx("button", { type: "button", onClick: connect, className: "bg-blue-500 text-white px-5 py-2 rounded text-base mr-2 hover:bg-blue-600 transition-colors", children: "Connect" })), isConnected && (_jsx("button", { type: "button", onClick: scopesHaveChanged() ? connect : disconnect, className: "bg-blue-500 text-white px-5 py-2 rounded text-base hover:bg-blue-600 transition-colors", children: scopesHaveChanged() ? `Re Establishing Connection` : `Disconnect` }))] }), error && (_jsxs("section", { className: "bg-white rounded-lg p-8 mb-6 shadow-sm", children: [_jsx("h2", { className: "text-2xl font-bold text-red-600 mb-4", children: "Error" }), _jsx("p", { className: "text-gray-700", children: error.message.toString() })] })), _jsx("section", { className: "bg-white rounded-lg p-8 mb-6 shadow-sm", children: Object.keys(session?.sessionScopes ?? {}).length > 0 && (_jsxs("section", { className: "mb-6", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-800 mb-6", children: "Connected Networks" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: Object.entries(session?.sessionScopes ?? {}).map(([scope, details]) => {
                                    return _jsx(ScopeCard, { scope: scope, details: details }, scope);
                                }) })] })) })] }) }));
}
export default App;
//# sourceMappingURL=App.mjs.map