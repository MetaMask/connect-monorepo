"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopeCard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_specs_1 = __importDefault(require("@metamask/api-specs"));
const utils_1 = require("@metamask/utils");
const react_1 = require("react");
const methods_1 = require("../constants/methods.cjs");
const networks_1 = require("../constants/networks.cjs");
const IdHelpers_1 = require("../helpers/IdHelpers.cjs");
const JsonHelpers_1 = require("../helpers/JsonHelpers.cjs");
const MethodInvocationHelpers_1 = require("../helpers/MethodInvocationHelpers.cjs");
const solana_method_signatures_1 = require("../helpers/solana-method-signatures.cjs");
const sdk_1 = require("../sdk/index.cjs");
const metamaskOpenrpcDocument = api_specs_1.default;
function ScopeCard({ scope, details }) {
    const { accounts } = details;
    const setInitialMethodsAndAccounts = (0, react_1.useCallback)((currentSession) => {
        const initialSelectedMethods = {};
        const initialSelectedAccounts = {};
        const initialInvokeMethodRequests = {};
        Object.entries(currentSession.sessionScopes).forEach(([scope, details]) => {
            if (details.accounts?.[0]) {
                initialSelectedAccounts[scope] = details.accounts[0];
            }
            const getInvokeMethodRequest = (request) => ({
                method: 'wallet_invokeMethod',
                params: {
                    scope,
                    request,
                },
            });
            if (scope.startsWith('eip155:')) {
                initialSelectedMethods[scope] = 'eth_blockNumber';
                const example = metamaskOpenrpcDocument?.methods.find((method) => method.name === 'eth_blockNumber');
                const request = (0, JsonHelpers_1.openRPCExampleToJSON)(example);
                const invokeMethodRequest = getInvokeMethodRequest(request);
                initialInvokeMethodRequests[scope] = JSON.stringify(invokeMethodRequest, null, 2);
            }
        });
        setInvokeMethodRequests(initialInvokeMethodRequests);
        setSelectedMethods(initialSelectedMethods);
        setSelectedAccounts(initialSelectedAccounts);
    }, []);
    const handleSessionChangedNotification = (0, react_1.useCallback)((notification) => {
        if (notification.params?.sessionScopes) {
            setInitialMethodsAndAccounts({
                sessionScopes: notification.params.sessionScopes,
            });
        }
    }, [setInitialMethodsAndAccounts]);
    const { invokeMethod, session } = (0, sdk_1.useSDK)();
    (0, react_1.useEffect)(() => {
        handleSessionChangedNotification(session);
    }, [session, handleSessionChangedNotification]);
    const [invokeMethodResults, setInvokeMethodResults] = (0, react_1.useState)({});
    const [selectedAccount, setSelectedAccount] = (0, react_1.useState)(accounts?.length ? accounts[0] : undefined);
    const [invokeMethodRequests, setInvokeMethodRequests] = (0, react_1.useState)({});
    const [selectedAccounts, setSelectedAccounts] = (0, react_1.useState)({
        [scope]: accounts?.length ? (accounts[0] ?? null) : null,
    });
    const [selectedMethods, setSelectedMethods] = (0, react_1.useState)({});
    const networkName = (0, networks_1.getNetworkName)(scope);
    const accountCount = accounts?.length ?? 0;
    const handleUpdateInvokeMethodSolana = async (scope, address, method) => {
        if (!scope.startsWith('solana:')) {
            throw new Error('Invalid CAIP chain ID. It must start with "solana:"');
        }
        const solanaExample = await (0, solana_method_signatures_1.generateSolanaMethodExamples)(method, address);
        const defaultRequest = {
            method: 'wallet_invokeMethod',
            params: {
                scope,
                request: {
                    method,
                    ...solanaExample,
                },
            },
        };
        setInvokeMethodRequests((prev) => ({
            ...prev,
            [scope]: JSON.stringify(defaultRequest, null, 2),
        }));
    };
    const handleMethodSelect = async (evt, scope) => {
        const selectedMethod = evt.target.value;
        setSelectedMethods((prev) => ({
            ...prev,
            [scope]: selectedMethod,
        }));
        const selectedAddress = selectedAccounts[scope];
        if (!selectedAddress) {
            return;
        }
        if (scope.startsWith('solana:')) {
            await handleUpdateInvokeMethodSolana(scope, (0, utils_1.parseCaipAccountId)(selectedAddress).address, selectedMethod);
        }
        else {
            const example = metamaskOpenrpcDocument?.methods.find((method) => method.name === selectedMethod);
            if (example) {
                let exampleParams = (0, JsonHelpers_1.openRPCExampleToJSON)(example);
                if (selectedMethod in methods_1.METHODS_REQUIRING_PARAM_INJECTION) {
                    exampleParams = (0, methods_1.injectParams)(selectedMethod, exampleParams, selectedAddress, scope);
                }
                const defaultRequest = {
                    method: 'wallet_invokeMethod',
                    params: {
                        scope,
                        request: exampleParams,
                    },
                };
                setInvokeMethodRequests((prev) => ({
                    ...prev,
                    [scope]: JSON.stringify(defaultRequest, null, 2),
                }));
            }
        }
    };
    const handleInvokeMethod = async (scope, method, requestObject) => {
        console.log(`🔧 handleInvokeMethod called: ${method} on ${scope}`);
        // Handle missing request gracefully
        const scopeRequest = invokeMethodRequests[scope];
        if (!requestObject && !scopeRequest) {
            throw new Error(`No request configured for method ${method} on scope ${scope}`);
        }
        const finalRequestObject = requestObject ?? JSON.parse(scopeRequest ?? '{}');
        console.log(`📋 Request object:`, finalRequestObject);
        try {
            // Extract and normalize parameters
            const params = (0, MethodInvocationHelpers_1.extractRequestParams)(finalRequestObject);
            console.log(`📤 Calling invokeMethod with params:`, params);
            const normalizedParams = (0, MethodInvocationHelpers_1.normalizeMethodParams)(method, params, scope);
            console.log(`📤 Normalized params:`, normalizedParams);
            const result = await invokeMethod({
                scope,
                request: {
                    method,
                    params: normalizedParams,
                },
            });
            console.log(`📥 Received result:`, result);
            const request = (0, MethodInvocationHelpers_1.extractRequestForStorage)(finalRequestObject);
            setInvokeMethodResults((prev) => {
                const newResults = (0, MethodInvocationHelpers_1.updateInvokeMethodResults)(prev, scope, method, result, request);
                console.log(`💾 Updated invoke results:`, newResults);
                return newResults;
            });
        }
        catch (error) {
            console.error('❌ Error invoking method:', error);
            const request = (0, MethodInvocationHelpers_1.extractRequestForStorage)(finalRequestObject);
            setInvokeMethodResults((prev) => {
                const newResults = (0, MethodInvocationHelpers_1.updateInvokeMethodResults)(prev, scope, method, error, request);
                console.log(`💾 Updated invoke results (error):`, newResults);
                return newResults;
            });
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { "data-testid": `scope-card-${(0, IdHelpers_1.escapeHtmlId)(scope)}`, className: "bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between mb-4", children: (0, jsx_runtime_1.jsx)("h3", { title: `${networkName} (${scope})`, className: "text-lg font-semibold text-gray-800 truncate", children: networkName }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm font-medium text-gray-600", children: "Accounts:" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-sm text-gray-500 bg-blue-50 text-blue-700 px-2 py-1 rounded-full", children: [accountCount, " available"] })] }), (0, jsx_runtime_1.jsxs)("select", { value: selectedAccount, onChange: async (evt) => {
                            const selectedAccountValue = evt.target.value;
                            setSelectedAccount(selectedAccountValue);
                            setSelectedAccounts((prev) => ({
                                ...prev,
                                [scope]: selectedAccountValue,
                            }));
                        }, "data-testid": `accounts-select-${(0, IdHelpers_1.escapeHtmlId)(scope)}`, id: `accounts-select-${(0, IdHelpers_1.escapeHtmlId)(scope)}`, className: "w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Select an account" }), (accounts ?? []).map((account) => {
                                const { address } = (0, utils_1.parseCaipAccountId)(account);
                                return ((0, jsx_runtime_1.jsx)("option", { "data-testid": `${(0, IdHelpers_1.escapeHtmlId)(String(account))}-option`, value: account, children: address }, address));
                            })] })] }), selectedAccount && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 p-3 bg-green-50 border border-green-200 rounded-md", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm text-green-800 font-medium", children: "Active Account:" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-green-700 font-mono break-all", children: (0, utils_1.parseCaipAccountId)(selectedAccount).address })] })), (0, jsx_runtime_1.jsxs)("div", { className: "mb-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm font-medium text-gray-600", children: "Available Methods:" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-sm text-gray-500 bg-purple-50 text-purple-700 px-2 py-1 rounded-full", children: [details.methods?.length ?? 0, " available"] })] }), (0, jsx_runtime_1.jsxs)("select", { "data-testid": `${(0, IdHelpers_1.escapeHtmlId)(scope)}-select`, value: selectedMethods[scope] ?? '', onChange: async (evt) => {
                            await handleMethodSelect(evt, scope);
                        }, id: `method-select-${(0, IdHelpers_1.escapeHtmlId)(scope)}`, className: "w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white hover:border-gray-400", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Select a method to invoke" }), (details.methods ?? []).map((method) => ((0, jsx_runtime_1.jsx)("option", { "data-testid": `${(0, IdHelpers_1.escapeHtmlId)(scope)}-${method}-option`, value: method, children: method }, method)))] })] }), selectedMethods[scope] && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm text-purple-800 font-medium", children: "Selected Method:" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-purple-700 font-mono", children: selectedMethods[scope] })] })), (0, jsx_runtime_1.jsxs)("details", { className: "mt-4 border border-gray-200 rounded-lg", "data-testid": `invoke-method-details-${(0, IdHelpers_1.escapeHtmlId)(scope)}`, id: `invoke-method-details-${(0, IdHelpers_1.escapeHtmlId)(scope)}`, children: [(0, jsx_runtime_1.jsxs)("summary", { className: "px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors duration-150 rounded-t-lg flex items-center gap-2 font-medium text-gray-700", children: [(0, jsx_runtime_1.jsxs)("svg", { className: "w-4 h-4 transform transition-transform duration-200", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [(0, jsx_runtime_1.jsx)("title", { children: "Invoke Method" }), (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" })] }), "Invoke Method Request"] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-white border-t border-gray-200", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-2", children: (0, jsx_runtime_1.jsx)("label", { htmlFor: `invoke-method-request-${(0, IdHelpers_1.escapeHtmlId)(scope)}`, className: "block text-sm font-medium text-gray-600 mb-1", children: "JSON Request:" }) }), (0, jsx_runtime_1.jsx)("textarea", { "data-testid": `${(0, IdHelpers_1.escapeHtmlId)(scope)}-collapsible-content-textarea`, value: invokeMethodRequests[scope] ?? '', onChange: (evt) => setInvokeMethodRequests((prev) => ({ ...prev, [scope]: evt.target.value })), rows: 12, id: `invoke-method-request-${(0, IdHelpers_1.escapeHtmlId)(scope)}`, className: "w-full p-3 font-mono text-sm border border-gray-300 rounded-md resize-y min-h-[200px] max-h-[400px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50", placeholder: "Method request will appear here...", spellCheck: false }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 text-xs text-gray-500", children: "Edit the JSON above to customize the request parameters before invoking the method." })] })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", "data-testid": `invoke-method-${(0, IdHelpers_1.escapeHtmlId)(scope)}-btn`, onClick: async () => {
                    const method = selectedMethods[scope];
                    if (method) {
                        await handleInvokeMethod(scope, method);
                    }
                }, id: `invoke-method-${(0, IdHelpers_1.escapeHtmlId)(scope)}-btn`, disabled: !selectedMethods[scope] || !invokeMethodRequests[scope], className: `
            w-full mt-4 px-6 py-3 rounded-lg font-medium text-white transition-all duration-200
            flex items-center justify-center gap-2
            ${!selectedMethods[scope] || !invokeMethodRequests[scope]
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer'}
          `, children: [(0, jsx_runtime_1.jsxs)("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: [(0, jsx_runtime_1.jsx)("title", { children: "Invoke Method" }), (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 10V3L4 14h7v7l9-11h-7z" })] }), "Invoke Method"] }), Object.entries(invokeMethodResults[scope] ?? {}).map(([method, results]) => {
                return results.map(({ result, request }, index) => {
                    const { text, truncated } = (0, JsonHelpers_1.truncateJSON)(result, 150);
                    const isError = result instanceof Error;
                    return truncated ? ((0, jsx_runtime_1.jsxs)("details", { "data-testid": `method-result-details-${(0, IdHelpers_1.escapeHtmlId)(scope)}-${method}-${index}`, id: `method-result-details-${(0, IdHelpers_1.escapeHtmlId)(scope)}-${method}-${index}`, className: "mt-4 border border-gray-200 rounded-lg", children: [(0, jsx_runtime_1.jsx)("summary", { className: `px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors duration-150 rounded-t-lg ${isError ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("svg", { className: "w-4 h-4 transform transition-transform duration-200", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [(0, jsx_runtime_1.jsx)("title", { children: "Scope card" }), (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-1", children: [(0, jsx_runtime_1.jsx)("span", { className: `font-mono text-sm font-medium ${isError ? 'text-red-700' : 'text-purple-700'}`, children: method }), (0, jsx_runtime_1.jsx)("span", { className: `text-xs px-2 py-1 rounded-full ${isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`, children: isError ? 'Error' : 'Success' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-xs text-gray-500 mb-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: "Params:" }), " ", JSON.stringify(request.params)] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-xs text-gray-600 font-mono bg-gray-100 p-2 rounded", children: [text, "..."] })] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 bg-white border-t border-gray-200", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-2", children: (0, jsx_runtime_1.jsx)("div", { className: "block text-sm font-medium text-gray-600 mb-1", children: "Full Response:" }) }), (0, jsx_runtime_1.jsx)("div", { className: "relative", children: (0, jsx_runtime_1.jsx)("pre", { className: "bg-gray-50 p-4 rounded-md text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 text-left", children: (0, jsx_runtime_1.jsx)("code", { id: `invoke-method-${(0, IdHelpers_1.escapeHtmlId)(scope)}-${method}-result-${index}`, className: isError ? 'text-red-600' : 'text-gray-800', children: JSON.stringify(result, null, 2) }) }) })] })] }, `${method}-${index}`)) : ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 border border-gray-200 rounded-lg bg-white", "data-testid": `method-result-item-${(0, IdHelpers_1.escapeHtmlId)(scope)}-${method}-${index}`, id: `method-result-item-${(0, IdHelpers_1.escapeHtmlId)(scope)}-${method}-${index}`, children: [(0, jsx_runtime_1.jsx)("div", { className: `px-4 py-3 border-b border-gray-200 ${isError ? 'bg-red-50' : 'bg-gray-50'}`, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-1", children: [(0, jsx_runtime_1.jsx)("span", { className: `font-mono text-sm font-medium ${isError ? 'text-red-700' : 'text-purple-700'}`, children: method }), (0, jsx_runtime_1.jsx)("span", { className: `text-xs px-2 py-1 rounded-full ${isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`, children: isError ? 'Error' : 'Success' })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "p-4", children: (0, jsx_runtime_1.jsx)("div", { className: "relative", children: (0, jsx_runtime_1.jsx)("pre", { className: "bg-gray-50 p-4 rounded-md text-sm font-mono overflow-x-auto border border-gray-200 text-left", children: (0, jsx_runtime_1.jsx)("code", { id: `invoke-method-${(0, IdHelpers_1.escapeHtmlId)(scope)}-${method}-result-${index}`, className: isError ? 'text-red-600' : 'text-gray-800', children: text }) }) }) })] }, `${method}-${index}`));
                });
            })] }, scope));
}
exports.ScopeCard = ScopeCard;
//# sourceMappingURL=ScopeCard.cjs.map