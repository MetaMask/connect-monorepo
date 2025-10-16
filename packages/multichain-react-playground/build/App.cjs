"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const sdk_1 = require("./sdk/index.cjs");
const DynamicInputs_1 = __importStar(require("./components/DynamicInputs.cjs"));
const networks_1 = require("./constants/networks.cjs");
const ScopeCard_1 = require("./components/ScopeCard.cjs");
const buffer_1 = require("buffer");
global.Buffer = buffer_1.Buffer;
function App() {
    const [customScopes, setCustomScopes] = (0, react_1.useState)(['eip155:1']);
    const [caipAccountIds, setCaipAccountIds] = (0, react_1.useState)([]);
    const { error, state, session, connect: sdkConnect, disconnect: sdkDisconnect } = (0, sdk_1.useSDK)();
    const handleCheckboxChange = (0, react_1.useCallback)((value, isChecked) => {
        if (isChecked) {
            setCustomScopes(Array.from(new Set([...customScopes, value])));
        }
        else {
            setCustomScopes(customScopes.filter((item) => item !== value));
        }
    }, [customScopes]);
    (0, react_1.useEffect)(() => {
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
    const scopesHaveChanged = (0, react_1.useCallback)(() => {
        if (!session)
            return false;
        const sessionScopes = Object.keys(session?.sessionScopes ?? {});
        const currentScopes = customScopes.filter((scope) => scope.length);
        if (sessionScopes.length !== currentScopes.length)
            return true;
        return !sessionScopes.every((scope) => currentScopes.includes(scope)) || !currentScopes.every((scope) => sessionScopes.includes(scope));
    }, [session, customScopes]);
    const connect = (0, react_1.useCallback)(async () => {
        const selectedScopesArray = customScopes.filter((scope) => scope.length);
        const filteredAccountIds = caipAccountIds.filter((addr) => addr.trim() !== '');
        return sdkConnect(selectedScopesArray, filteredAccountIds);
    }, [customScopes, caipAccountIds, sdkConnect]);
    const disconnect = (0, react_1.useCallback)(async () => {
        await sdkDisconnect();
    }, [sdkDisconnect]);
    const availableOptions = Object.keys(networks_1.FEATURED_NETWORKS).reduce((all, networkName) => {
        const networkCaipValue = networks_1.FEATURED_NETWORKS[networkName];
        all.push({ name: networkName, value: networkCaipValue });
        return all;
    }, []);
    const isDisconnected = state === 'disconnected' || state === 'pending' || state === 'loaded';
    const isConnected = state === 'connected';
    const isConnecting = state === 'connecting';
    return ((0, jsx_runtime_1.jsx)("div", { className: "min-h-screen bg-gray-50 flex justify-center", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-6xl w-full p-8", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-slate-800 text-4xl font-bold mb-8 text-center", children: "MetaMask MultiChain API Test Dapp" }), (0, jsx_runtime_1.jsxs)("section", { className: "bg-white rounded-lg p-8 mb-6 shadow-sm", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-4", children: (0, jsx_runtime_1.jsx)(DynamicInputs_1.default, { availableOptions: availableOptions, inputArray: customScopes, handleCheckboxChange: handleCheckboxChange, label: DynamicInputs_1.INPUT_LABEL_TYPE.SCOPE }) }), isConnecting && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: connect, className: "bg-blue-500 text-white px-5 py-2 rounded text-base mr-2 hover:bg-blue-600 transition-colors", children: "Connecting" })), isDisconnected && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: connect, className: "bg-blue-500 text-white px-5 py-2 rounded text-base mr-2 hover:bg-blue-600 transition-colors", children: "Connect" })), isConnected && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: scopesHaveChanged() ? connect : disconnect, className: "bg-blue-500 text-white px-5 py-2 rounded text-base hover:bg-blue-600 transition-colors", children: scopesHaveChanged() ? `Re Establishing Connection` : `Disconnect` }))] }), error && ((0, jsx_runtime_1.jsxs)("section", { className: "bg-white rounded-lg p-8 mb-6 shadow-sm", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold text-red-600 mb-4", children: "Error" }), (0, jsx_runtime_1.jsx)("p", { className: "text-gray-700", children: error.message.toString() })] })), (0, jsx_runtime_1.jsx)("section", { className: "bg-white rounded-lg p-8 mb-6 shadow-sm", children: Object.keys(session?.sessionScopes ?? {}).length > 0 && ((0, jsx_runtime_1.jsxs)("section", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold text-gray-800 mb-6", children: "Connected Networks" }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: Object.entries(session?.sessionScopes ?? {}).map(([scope, details]) => {
                                    return (0, jsx_runtime_1.jsx)(ScopeCard_1.ScopeCard, { scope: scope, details: details }, scope);
                                }) })] })) })] }) }));
}
exports.default = App;
//# sourceMappingURL=App.cjs.map