"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncateJSON = exports.openRPCExampleToJSON = void 0;
const paramsToObj = (params, methodParams) => {
    return params.reduce((acc, val, i) => {
        const paramName = methodParams[i]?.name;
        if (paramName) {
            acc[paramName] = val;
        }
        return acc;
    }, {});
};
const openRPCExampleToJSON = (method) => {
    if (!method.examples || method.examples.length === 0) {
        return {
            method: method.name,
            params: [],
        };
    }
    const examplePairing = method.examples?.[0];
    const ex = examplePairing;
    const paramsFromExample = ex.params.map((example) => example.value);
    const params = method.paramStructure === 'by-name' ? paramsToObj(paramsFromExample, method.params) : paramsFromExample;
    return {
        method: method.name,
        params,
    };
};
exports.openRPCExampleToJSON = openRPCExampleToJSON;
const truncateJSON = (json, maxLength = 100) => {
    const originalStringified = JSON.stringify(json);
    if (originalStringified.length <= maxLength) {
        return { text: originalStringified, truncated: false };
    }
    return {
        text: originalStringified.slice(0, maxLength),
        truncated: true,
    };
};
exports.truncateJSON = truncateJSON;
//# sourceMappingURL=JsonHelpers.cjs.map