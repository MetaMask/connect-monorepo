/** biome-ignore-all lint/suspicious/noExplicitAny: OK */
import type { MethodObject } from "@open-rpc/meta-schema";
export declare const openRPCExampleToJSON: (method: MethodObject) => {
    method: string;
    params: any;
};
export declare const truncateJSON: (json: any, maxLength?: number) => {
    text: string;
    truncated: boolean;
};
//# sourceMappingURL=JsonHelpers.d.mts.map