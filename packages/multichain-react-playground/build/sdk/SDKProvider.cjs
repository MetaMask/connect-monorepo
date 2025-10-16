"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSDK = exports.SDKProvider = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/* eslint-disable */
const multichain_1 = require("@metamask/multichain");
const react_1 = require("react");
const constants_1 = require("../constants/index.cjs");
const SDKContext = (0, react_1.createContext)(undefined);
const SDKProvider = ({ children }) => {
    const [state, setState] = (0, react_1.useState)('pending');
    const [session, setSession] = (0, react_1.useState)(undefined);
    const [error, setError] = (0, react_1.useState)(null);
    const sdkRef = (0, react_1.useRef)(undefined);
    (0, react_1.useEffect)(() => {
        if (!sdkRef.current) {
            sdkRef.current = (0, multichain_1.createMetamaskSDK)({
                dapp: {
                    name: 'playground',
                    url: 'https://playground.metamask.io',
                },
                analytics: {
                    enabled: false,
                },
                transport: {
                    extensionId: constants_1.METAMASK_PROD_CHROME_ID,
                    onNotification: (notification) => {
                        const payload = notification;
                        if (payload.method === 'wallet_sessionChanged' || payload.method === 'wallet_createSession' || payload.method === 'wallet_getSession') {
                            setSession(payload.params);
                        }
                        else if (payload.method === 'stateChanged') {
                            setState(payload.params);
                        }
                    },
                },
            });
        }
    }, []);
    const disconnect = (0, react_1.useCallback)(async () => {
        try {
            if (!sdkRef.current) {
                throw new Error('SDK not initialized');
            }
            const sdkInstance = await sdkRef.current;
            return sdkInstance.disconnect();
        }
        catch (error) {
            setError(error);
        }
    }, []);
    const connect = (0, react_1.useCallback)(async (scopes, caipAccountIds) => {
        try {
            if (!sdkRef.current) {
                throw new Error('SDK not initialized');
            }
            const sdkInstance = await sdkRef.current;
            await sdkInstance.connect(scopes, caipAccountIds);
        }
        catch (error) {
            setError(error);
        }
    }, []);
    const invokeMethod = (0, react_1.useCallback)(async (options) => {
        try {
            if (!sdkRef.current) {
                throw new Error('SDK not initialized');
            }
            const sdkInstance = await sdkRef.current;
            return sdkInstance.invokeMethod(options);
        }
        catch (error) {
            setError(error);
        }
    }, []);
    return ((0, jsx_runtime_1.jsx)(SDKContext.Provider, { value: {
            session,
            state,
            error,
            connect,
            disconnect,
            invokeMethod,
        }, children: children }));
};
exports.SDKProvider = SDKProvider;
const useSDK = () => {
    const context = (0, react_1.useContext)(SDKContext);
    if (context === undefined) {
        throw new Error('useSDK must be used within a SDKProvider');
    }
    return context;
};
exports.useSDK = useSDK;
//# sourceMappingURL=SDKProvider.cjs.map