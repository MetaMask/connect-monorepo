import { jsx as _jsx } from "react/jsx-runtime";
import $testinglibraryreact from "@testing-library/react";
const { render, screen } = $testinglibraryreact;
import App from "./App.mjs";
test('renders learn react link', () => {
    render(_jsx(App, {}));
    const linkElement = screen.getByText(/MetaMask MultiChain/iu);
    expect(linkElement).toBeInTheDocument();
});
//# sourceMappingURL=App.test.mjs.map