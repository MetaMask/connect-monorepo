import type React from "react";
export declare enum INPUT_LABEL_TYPE {
    ADDRESS = "Address",
    SCOPE = "Scope",
    CAIP_ACCOUNT_ID = "CAIP Address"
}
type DynamicInputsProps = {
    inputArray: string[];
    availableOptions: {
        name: string;
        value: string;
    }[];
    handleCheckboxChange: (value: string, isChecked: boolean) => void;
    label: INPUT_LABEL_TYPE;
};
declare const DynamicInputs: React.FC<DynamicInputsProps>;
export default DynamicInputs;
//# sourceMappingURL=DynamicInputs.d.mts.map