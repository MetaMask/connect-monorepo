"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INPUT_LABEL_TYPE = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
var INPUT_LABEL_TYPE;
(function (INPUT_LABEL_TYPE) {
    INPUT_LABEL_TYPE["ADDRESS"] = "Address";
    INPUT_LABEL_TYPE["SCOPE"] = "Scope";
    INPUT_LABEL_TYPE["CAIP_ACCOUNT_ID"] = "CAIP Address";
})(INPUT_LABEL_TYPE || (exports.INPUT_LABEL_TYPE = INPUT_LABEL_TYPE = {}));
const DynamicInputs = ({ inputArray, handleCheckboxChange, label, availableOptions }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-lg font-medium text-gray-800", children: [label, "s:"] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-4", children: availableOptions.map((option) => {
                    const isChecked = inputArray.includes(option.value);
                    return ((0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: isChecked, onChange: (e) => handleCheckboxChange(option.value, e.target.checked), className: "w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" }), (0, jsx_runtime_1.jsx)("span", { className: "text-gray-700 select-none", children: option.name })] }, `checkbox-${option.value}`));
                }) })] }));
};
exports.default = DynamicInputs;
//# sourceMappingURL=DynamicInputs.cjs.map