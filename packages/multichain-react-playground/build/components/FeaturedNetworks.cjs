"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeaturedNetworks = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// biome-ignore lint/style/useImportType: ok
const react_1 = __importDefault(require("react"));
const networks_1 = require("../constants/networks.cjs");
const IdHelpers_1 = require("../helpers/IdHelpers.cjs");
const FeaturedNetworks = ({ selectedScopes, setSelectedScopes, isExternallyConnectableConnected }) => {
    const featuredNetworks = Object.entries(networks_1.FEATURED_NETWORKS);
    return ((0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: featuredNetworks.map(([networkName, chainId]) => ((0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2 cursor-pointer", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", name: chainId, checked: selectedScopes[chainId] ?? false, onChange: (evt) => setSelectedScopes((prev) => ({
                        ...prev,
                        [chainId]: evt.target.checked,
                    })), disabled: !isExternallyConnectableConnected, "data-testid": `network-checkbox-${(0, IdHelpers_1.escapeHtmlId)(chainId)}`, id: `network-checkbox-${(0, IdHelpers_1.escapeHtmlId)(chainId)}`, className: "w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50" }), (0, jsx_runtime_1.jsx)("span", { className: "text-gray-700", children: networkName })] }, chainId))) }));
};
exports.FeaturedNetworks = FeaturedNetworks;
//# sourceMappingURL=FeaturedNetworks.cjs.map