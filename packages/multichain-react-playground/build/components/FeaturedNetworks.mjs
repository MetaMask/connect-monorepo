import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function $importDefault(module) {
    if (module?.__esModule) {
        return module.default;
    }
    return module;
}
// biome-ignore lint/style/useImportType: ok
import $React from "react";
const React = $importDefault($React);
import { FEATURED_NETWORKS } from "../constants/networks.mjs";
import { escapeHtmlId } from "../helpers/IdHelpers.mjs";
export const FeaturedNetworks = ({ selectedScopes, setSelectedScopes, isExternallyConnectableConnected }) => {
    const featuredNetworks = Object.entries(FEATURED_NETWORKS);
    return (_jsx("div", { className: "space-y-2", children: featuredNetworks.map(([networkName, chainId]) => (_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", name: chainId, checked: selectedScopes[chainId] ?? false, onChange: (evt) => setSelectedScopes((prev) => ({
                        ...prev,
                        [chainId]: evt.target.checked,
                    })), disabled: !isExternallyConnectableConnected, "data-testid": `network-checkbox-${escapeHtmlId(chainId)}`, id: `network-checkbox-${escapeHtmlId(chainId)}`, className: "w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50" }), _jsx("span", { className: "text-gray-700", children: networkName })] }, chainId))) }));
};
//# sourceMappingURL=FeaturedNetworks.mjs.map