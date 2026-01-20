// Re-export all helpers
export { getCaip25FormattedAddresses } from './address';

export { convertCaipChainIdsToHex } from './chainId';
export type { Hex } from './chainId';

export { openRPCExampleToJSON, truncateJSON } from './json';

export {
  normalizeMethodParams,
  updateInvokeMethodResults,
  extractRequestParams,
  extractRequestForStorage,
  autoSelectAccountForScope,
  prepareMethodRequest,
} from './methodInvocation';

export {
  createSignTypedDataParams,
  createPersonalSignMessage,
  getDefaultPersonalSignMessage,
} from './sign';
export type { EIP712Domain } from './sign';
