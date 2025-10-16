"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Eip155Methods = exports.Eip155Notifications = exports.WalletEip155Methods = exports.KnownWalletRpcMethods = exports.injectParams = exports.METHODS_REQUIRING_PARAM_INJECTION = void 0;
const api_specs_1 = __importDefault(require("@metamask/api-specs"));
const utils_1 = require("@metamask/utils");
/**
 * Methods that require an account parameter.
 */
exports.METHODS_REQUIRING_PARAM_INJECTION = {
    eth_sendTransaction: true,
    eth_signTypedData_v4: true,
    personal_sign: true,
    eth_getBalance: true,
    wallet_sendCalls: true,
    wallet_getCapabilities: true,
};
/**
 * Injects address and chainId (where applicable) into example params for a given method.
 * @param method - The method to inject the address into.
 * @param exampleParams - The example params to inject the address into.
 * @param addressToInject - The address to inject.
 * @param scopeToInject - The scope to inject the address into.
 * @returns The updated example params with the address injected.
 */
const injectParams = (method, exampleParams, addressToInject, scopeToInject) => {
    const { address: parsedAddress } = (0, utils_1.parseCaipAccountId)(addressToInject);
    const { reference: chainId } = (0, utils_1.parseCaipChainId)(scopeToInject);
    if (!(method in exports.METHODS_REQUIRING_PARAM_INJECTION) ||
        typeof exampleParams !== 'object' ||
        exampleParams === null ||
        !('method' in exampleParams) ||
        !('params' in exampleParams) ||
        !Array.isArray(exampleParams.params)) {
        return exampleParams;
    }
    switch (method) {
        case 'eth_sendTransaction':
            if (exampleParams.params.length > 0 && typeof exampleParams.params[0] === 'object' && exampleParams.params[0] !== null) {
                return {
                    ...exampleParams,
                    params: [
                        {
                            ...exampleParams.params[0],
                            from: parsedAddress,
                            to: parsedAddress,
                            value: '0x0',
                        },
                        ...exampleParams.params.slice(1),
                    ],
                };
            }
            break;
        case 'personal_sign':
            if (exampleParams.params.length >= 2) {
                return {
                    ...exampleParams,
                    params: [exampleParams.params[0], parsedAddress, ...exampleParams.params.slice(2)],
                };
            }
            break;
        case 'eth_signTypedData_v4':
            if (exampleParams.params.length >= 2 && typeof exampleParams.params[1] === 'object' && exampleParams.params[1] !== null) {
                const typedData = exampleParams.params[1];
                if (typeof typedData === 'object' && typedData !== null && 'domain' in typedData && typeof typedData.domain === 'object' && typedData.domain !== null) {
                    return {
                        ...exampleParams,
                        params: [
                            parsedAddress,
                            {
                                ...typedData,
                                domain: {
                                    ...typedData.domain,
                                    chainId,
                                },
                            },
                        ],
                    };
                }
            }
            break;
        case 'eth_getBalance':
            return {
                ...exampleParams,
                params: [parsedAddress, 'latest'],
            };
        // EIP-5792
        case 'wallet_sendCalls': {
            const params = exampleParams.params[0];
            if (typeof params === 'object') {
                return {
                    ...exampleParams,
                    params: [
                        {
                            ...params,
                            chainId: (0, utils_1.numberToHex)(Number(chainId)),
                            from: parsedAddress,
                        },
                    ],
                };
            }
            break;
        }
        case 'wallet_getCapabilities': {
            return {
                ...exampleParams,
                params: [parsedAddress, [(0, utils_1.numberToHex)(Number(chainId))]],
            };
        }
        default:
            break;
    }
    return exampleParams;
};
exports.injectParams = injectParams;
/**
 * Known Wallet RPC methods.
 */
exports.KnownWalletRpcMethods = ['wallet_registerOnboarding', 'wallet_scanQRCode'];
/**
 * Wallet methods that are EIP-155 compatible but not scoped to a specific chain.
 */
exports.WalletEip155Methods = ['wallet_addEthereumChain'];
/**
 * EIP-155 specific notifications.
 */
exports.Eip155Notifications = ['eth_subscription'];
/**
 * Methods that are only available in the EIP-1193 wallet provider.
 */
const Eip1193OnlyMethods = [
    'wallet_switchEthereumChain',
    'wallet_getPermissions',
    'wallet_requestPermissions',
    'wallet_revokePermissions',
    'eth_requestAccounts',
    'eth_accounts',
    'eth_coinbase',
    'net_version',
    'metamask_logWeb3ShimUsage',
    'metamask_getProviderState',
    'metamask_sendDomainMetadata',
    'wallet_registerOnboarding',
];
/**
 * All MetaMask methods, except for ones we have specified in the constants above.
 */
exports.Eip155Methods = api_specs_1.default.methods
    // eslint-disable-next-line @typescript-eslint/no-shadow
    .map(({ name }) => name)
    .filter((method) => !exports.WalletEip155Methods.includes(method))
    .filter((method) => !exports.KnownWalletRpcMethods.includes(method))
    .filter((method) => !Eip1193OnlyMethods.includes(method));
//# sourceMappingURL=methods.cjs.map