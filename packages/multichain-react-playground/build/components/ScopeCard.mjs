import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function $importDefault(module) {
    if (module?.__esModule) {
        return module.default;
    }
    return module;
}
import $MetaMaskOpenRPCDocument from "@metamask/api-specs";
const MetaMaskOpenRPCDocument = $importDefault($MetaMaskOpenRPCDocument);
import { parseCaipAccountId } from "@metamask/utils";
import $react from "react";
const { useCallback, useEffect, useState } = $react;
import { injectParams, METHODS_REQUIRING_PARAM_INJECTION } from "../constants/methods.mjs";
import { getNetworkName } from "../constants/networks.mjs";
import { escapeHtmlId } from "../helpers/IdHelpers.mjs";
import { openRPCExampleToJSON, truncateJSON } from "../helpers/JsonHelpers.mjs";
import { extractRequestForStorage, extractRequestParams, normalizeMethodParams, updateInvokeMethodResults } from "../helpers/MethodInvocationHelpers.mjs";
import { generateSolanaMethodExamples } from "../helpers/solana-method-signatures.mjs";
import { useSDK } from "../sdk/index.mjs";
const metamaskOpenrpcDocument = MetaMaskOpenRPCDocument;
export function ScopeCard({ scope, details }) {
    const { accounts } = details;
    const setInitialMethodsAndAccounts = useCallback((currentSession) => {
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
                const request = openRPCExampleToJSON(example);
                const invokeMethodRequest = getInvokeMethodRequest(request);
                initialInvokeMethodRequests[scope] = JSON.stringify(invokeMethodRequest, null, 2);
            }
        });
        setInvokeMethodRequests(initialInvokeMethodRequests);
        setSelectedMethods(initialSelectedMethods);
        setSelectedAccounts(initialSelectedAccounts);
    }, []);
    const handleSessionChangedNotification = useCallback((notification) => {
        if (notification.params?.sessionScopes) {
            setInitialMethodsAndAccounts({
                sessionScopes: notification.params.sessionScopes,
            });
        }
    }, [setInitialMethodsAndAccounts]);
    const { invokeMethod, session } = useSDK();
    useEffect(() => {
        handleSessionChangedNotification(session);
    }, [session, handleSessionChangedNotification]);
    const [invokeMethodResults, setInvokeMethodResults] = useState({});
    const [selectedAccount, setSelectedAccount] = useState(accounts?.length ? accounts[0] : undefined);
    const [invokeMethodRequests, setInvokeMethodRequests] = useState({});
    const [selectedAccounts, setSelectedAccounts] = useState({
        [scope]: accounts?.length ? (accounts[0] ?? null) : null,
    });
    const [selectedMethods, setSelectedMethods] = useState({});
    const networkName = getNetworkName(scope);
    const accountCount = accounts?.length ?? 0;
    const handleUpdateInvokeMethodSolana = async (scope, address, method) => {
        if (!scope.startsWith('solana:')) {
            throw new Error('Invalid CAIP chain ID. It must start with "solana:"');
        }
        const solanaExample = await generateSolanaMethodExamples(method, address);
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
            await handleUpdateInvokeMethodSolana(scope, parseCaipAccountId(selectedAddress).address, selectedMethod);
        }
        else {
            const example = metamaskOpenrpcDocument?.methods.find((method) => method.name === selectedMethod);
            if (example) {
                let exampleParams = openRPCExampleToJSON(example);
                if (selectedMethod in METHODS_REQUIRING_PARAM_INJECTION) {
                    exampleParams = injectParams(selectedMethod, exampleParams, selectedAddress, scope);
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
            const params = extractRequestParams(finalRequestObject);
            console.log(`📤 Calling invokeMethod with params:`, params);
            const normalizedParams = normalizeMethodParams(method, params, scope);
            console.log(`📤 Normalized params:`, normalizedParams);
            const result = await invokeMethod({
                scope,
                request: {
                    method,
                    params: normalizedParams,
                },
            });
            console.log(`📥 Received result:`, result);
            const request = extractRequestForStorage(finalRequestObject);
            setInvokeMethodResults((prev) => {
                const newResults = updateInvokeMethodResults(prev, scope, method, result, request);
                console.log(`💾 Updated invoke results:`, newResults);
                return newResults;
            });
        }
        catch (error) {
            console.error('❌ Error invoking method:', error);
            const request = extractRequestForStorage(finalRequestObject);
            setInvokeMethodResults((prev) => {
                const newResults = updateInvokeMethodResults(prev, scope, method, error, request);
                console.log(`💾 Updated invoke results (error):`, newResults);
                return newResults;
            });
        }
    };
    return (_jsxs("div", { "data-testid": `scope-card-${escapeHtmlId(scope)}`, className: "bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200", children: [_jsx("div", { className: "flex items-center justify-between mb-4", children: _jsx("h3", { title: `${networkName} (${scope})`, className: "text-lg font-semibold text-gray-800 truncate", children: networkName }) }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Accounts:" }), _jsxs("span", { className: "text-sm text-gray-500 bg-blue-50 text-blue-700 px-2 py-1 rounded-full", children: [accountCount, " available"] })] }), _jsxs("select", { value: selectedAccount, onChange: async (evt) => {
                            const selectedAccountValue = evt.target.value;
                            setSelectedAccount(selectedAccountValue);
                            setSelectedAccounts((prev) => ({
                                ...prev,
                                [scope]: selectedAccountValue,
                            }));
                        }, "data-testid": `accounts-select-${escapeHtmlId(scope)}`, id: `accounts-select-${escapeHtmlId(scope)}`, className: "w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors", children: [_jsx("option", { value: "", children: "Select an account" }), (accounts ?? []).map((account) => {
                                const { address } = parseCaipAccountId(account);
                                return (_jsx("option", { "data-testid": `${escapeHtmlId(String(account))}-option`, value: account, children: address }, address));
                            })] })] }), selectedAccount && (_jsxs("div", { className: "mt-4 p-3 bg-green-50 border border-green-200 rounded-md", children: [_jsx("p", { className: "text-sm text-green-800 font-medium", children: "Active Account:" }), _jsx("p", { className: "text-sm text-green-700 font-mono break-all", children: parseCaipAccountId(selectedAccount).address })] })), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Available Methods:" }), _jsxs("span", { className: "text-sm text-gray-500 bg-purple-50 text-purple-700 px-2 py-1 rounded-full", children: [details.methods?.length ?? 0, " available"] })] }), _jsxs("select", { "data-testid": `${escapeHtmlId(scope)}-select`, value: selectedMethods[scope] ?? '', onChange: async (evt) => {
                            await handleMethodSelect(evt, scope);
                        }, id: `method-select-${escapeHtmlId(scope)}`, className: "w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white hover:border-gray-400", children: [_jsx("option", { value: "", children: "Select a method to invoke" }), (details.methods ?? []).map((method) => (_jsx("option", { "data-testid": `${escapeHtmlId(scope)}-${method}-option`, value: method, children: method }, method)))] })] }), selectedMethods[scope] && (_jsxs("div", { className: "mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md", children: [_jsx("p", { className: "text-sm text-purple-800 font-medium", children: "Selected Method:" }), _jsx("p", { className: "text-sm text-purple-700 font-mono", children: selectedMethods[scope] })] })), _jsxs("details", { className: "mt-4 border border-gray-200 rounded-lg", "data-testid": `invoke-method-details-${escapeHtmlId(scope)}`, id: `invoke-method-details-${escapeHtmlId(scope)}`, children: [_jsxs("summary", { className: "px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors duration-150 rounded-t-lg flex items-center gap-2 font-medium text-gray-700", children: [_jsxs("svg", { className: "w-4 h-4 transform transition-transform duration-200", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [_jsx("title", { children: "Invoke Method" }), _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" })] }), "Invoke Method Request"] }), _jsxs("div", { className: "p-4 bg-white border-t border-gray-200", children: [_jsx("div", { className: "mb-2", children: _jsx("label", { htmlFor: `invoke-method-request-${escapeHtmlId(scope)}`, className: "block text-sm font-medium text-gray-600 mb-1", children: "JSON Request:" }) }), _jsx("textarea", { "data-testid": `${escapeHtmlId(scope)}-collapsible-content-textarea`, value: invokeMethodRequests[scope] ?? '', onChange: (evt) => setInvokeMethodRequests((prev) => ({ ...prev, [scope]: evt.target.value })), rows: 12, id: `invoke-method-request-${escapeHtmlId(scope)}`, className: "w-full p-3 font-mono text-sm border border-gray-300 rounded-md resize-y min-h-[200px] max-h-[400px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50", placeholder: "Method request will appear here...", spellCheck: false }), _jsx("div", { className: "mt-2 text-xs text-gray-500", children: "Edit the JSON above to customize the request parameters before invoking the method." })] })] }), _jsxs("button", { type: "button", "data-testid": `invoke-method-${escapeHtmlId(scope)}-btn`, onClick: async () => {
                    const method = selectedMethods[scope];
                    if (method) {
                        await handleInvokeMethod(scope, method);
                    }
                }, id: `invoke-method-${escapeHtmlId(scope)}-btn`, disabled: !selectedMethods[scope] || !invokeMethodRequests[scope], className: `
            w-full mt-4 px-6 py-3 rounded-lg font-medium text-white transition-all duration-200
            flex items-center justify-center gap-2
            ${!selectedMethods[scope] || !invokeMethodRequests[scope]
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer'}
          `, children: [_jsxs("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: [_jsx("title", { children: "Invoke Method" }), _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 10V3L4 14h7v7l9-11h-7z" })] }), "Invoke Method"] }), Object.entries(invokeMethodResults[scope] ?? {}).map(([method, results]) => {
                return results.map(({ result, request }, index) => {
                    const { text, truncated } = truncateJSON(result, 150);
                    const isError = result instanceof Error;
                    return truncated ? (_jsxs("details", { "data-testid": `method-result-details-${escapeHtmlId(scope)}-${method}-${index}`, id: `method-result-details-${escapeHtmlId(scope)}-${method}-${index}`, className: "mt-4 border border-gray-200 rounded-lg", children: [_jsx("summary", { className: `px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors duration-150 rounded-t-lg ${isError ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("svg", { className: "w-4 h-4 transform transition-transform duration-200", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [_jsx("title", { children: "Scope card" }), _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" })] }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: `font-mono text-sm font-medium ${isError ? 'text-red-700' : 'text-purple-700'}`, children: method }), _jsx("span", { className: `text-xs px-2 py-1 rounded-full ${isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`, children: isError ? 'Error' : 'Success' })] }), _jsxs("div", { className: "text-xs text-gray-500 mb-1", children: [_jsx("span", { className: "font-medium", children: "Params:" }), " ", JSON.stringify(request.params)] }), _jsxs("div", { className: "text-xs text-gray-600 font-mono bg-gray-100 p-2 rounded", children: [text, "..."] })] })] }) }), _jsxs("div", { className: "p-4 bg-white border-t border-gray-200", children: [_jsx("div", { className: "mb-2", children: _jsx("div", { className: "block text-sm font-medium text-gray-600 mb-1", children: "Full Response:" }) }), _jsx("div", { className: "relative", children: _jsx("pre", { className: "bg-gray-50 p-4 rounded-md text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 text-left", children: _jsx("code", { id: `invoke-method-${escapeHtmlId(scope)}-${method}-result-${index}`, className: isError ? 'text-red-600' : 'text-gray-800', children: JSON.stringify(result, null, 2) }) }) })] })] }, `${method}-${index}`)) : (_jsxs("div", { className: "mt-4 border border-gray-200 rounded-lg bg-white", "data-testid": `method-result-item-${escapeHtmlId(scope)}-${method}-${index}`, id: `method-result-item-${escapeHtmlId(scope)}-${method}-${index}`, children: [_jsx("div", { className: `px-4 py-3 border-b border-gray-200 ${isError ? 'bg-red-50' : 'bg-gray-50'}`, children: _jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: `font-mono text-sm font-medium ${isError ? 'text-red-700' : 'text-purple-700'}`, children: method }), _jsx("span", { className: `text-xs px-2 py-1 rounded-full ${isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`, children: isError ? 'Error' : 'Success' })] }) }), _jsx("div", { className: "p-4", children: _jsx("div", { className: "relative", children: _jsx("pre", { className: "bg-gray-50 p-4 rounded-md text-sm font-mono overflow-x-auto border border-gray-200 text-left", children: _jsx("code", { id: `invoke-method-${escapeHtmlId(scope)}-${method}-result-${index}`, className: isError ? 'text-red-600' : 'text-gray-800', children: text }) }) }) })] }, `${method}-${index}`));
                });
            })] }, scope));
}
//# sourceMappingURL=ScopeCard.mjs.map