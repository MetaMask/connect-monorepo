import { jsx as _jsx } from "react/jsx-runtime";
/* eslint-disable */
import { createMetamaskSDK } from "@metamask/multichain";
import $react from "react";
const { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } = $react;
import { METAMASK_PROD_CHROME_ID } from "../constants/index.mjs";
const SDKContext = createContext(undefined);
export const SDKProvider = ({ children }) => {
    const [state, setState] = useState('pending');
    const [session, setSession] = useState(undefined);
    const [error, setError] = useState(null);
    const sdkRef = useRef(undefined);
    useEffect(() => {
        if (!sdkRef.current) {
            sdkRef.current = createMetamaskSDK({
                dapp: {
                    name: 'playground',
                    url: 'https://playground.metamask.io',
                },
                analytics: {
                    enabled: false,
                },
                transport: {
                    extensionId: METAMASK_PROD_CHROME_ID,
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
    const disconnect = useCallback(async () => {
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
    const connect = useCallback(async (scopes, caipAccountIds) => {
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
    const invokeMethod = useCallback(async (options) => {
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
    return (_jsx(SDKContext.Provider, { value: {
            session,
            state,
            error,
            connect,
            disconnect,
            invokeMethod,
        }, children: children }));
};
export const useSDK = () => {
    const context = useContext(SDKContext);
    if (context === undefined) {
        throw new Error('useSDK must be used within a SDKProvider');
    }
    return context;
};
//# sourceMappingURL=SDKProvider.mjs.map