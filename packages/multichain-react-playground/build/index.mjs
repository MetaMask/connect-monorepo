import { jsx as _jsx } from "react/jsx-runtime";
function $importDefault(module) {
    if (module?.__esModule) {
        return module.default;
    }
    return module;
}
import $React from "react";
const React = $importDefault($React);
import $ReactDOM from "react-dom/client";
const ReactDOM = $importDefault($ReactDOM);
import "./index.css";
import App from "./App.mjs";
import { SDKProvider } from "./sdk/SDKProvider.mjs";
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(_jsx(React.StrictMode, { children: _jsx(SDKProvider, { children: _jsx(App, {}) }) }));
//# sourceMappingURL=index.mjs.map