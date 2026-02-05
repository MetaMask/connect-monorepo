export { getCaip25FormattedAddresses } from './address';

export { convertCaipChainIdsToHex } from './chainId';

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

export { escapeTestId, createTestId } from '../utils/testId';
