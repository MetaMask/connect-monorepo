import { type InvokeMethodOptions, type Scope, type SDKState, type SessionData } from "@metamask/multichain";
import type { CaipAccountId } from "@metamask/utils";
import type React from "react";
export declare const SDKProvider: ({ children }: {
    children: React.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const useSDK: () => {
    session: SessionData | undefined;
    state: SDKState;
    error: Error | null;
    connect: (scopes: Scope[], caipAccountIds: CaipAccountId[]) => Promise<void>;
    disconnect: () => Promise<void>;
    invokeMethod: (options: InvokeMethodOptions) => Promise<any>;
};
//# sourceMappingURL=SDKProvider.d.mts.map