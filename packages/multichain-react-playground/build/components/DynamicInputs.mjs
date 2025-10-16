import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
export var INPUT_LABEL_TYPE;
(function (INPUT_LABEL_TYPE) {
    INPUT_LABEL_TYPE["ADDRESS"] = "Address";
    INPUT_LABEL_TYPE["SCOPE"] = "Scope";
    INPUT_LABEL_TYPE["CAIP_ACCOUNT_ID"] = "CAIP Address";
})(INPUT_LABEL_TYPE || (INPUT_LABEL_TYPE = {}));
const DynamicInputs = ({ inputArray, handleCheckboxChange, label, availableOptions }) => {
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("h3", { className: "text-lg font-medium text-gray-800", children: [label, "s:"] }), _jsx("div", { className: "flex flex-wrap gap-4", children: availableOptions.map((option) => {
                    const isChecked = inputArray.includes(option.value);
                    return (_jsxs("label", { className: "flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: isChecked, onChange: (e) => handleCheckboxChange(option.value, e.target.checked), className: "w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" }), _jsx("span", { className: "text-gray-700 select-none", children: option.name })] }, `checkbox-${option.value}`));
                }) })] }));
};
export default DynamicInputs;
//# sourceMappingURL=DynamicInputs.mjs.map