import { createLogger, enableDebug } from '@metamask/connect-multichain';

const namespace = 'metamask-connect:evm';

// TODO: (@wenfix) Conditionally enable debug based on environment variable or storage setting
// enableDebug(namespace);

// @ts-expect-error logger needs to be typed properly
export const logger = createLogger(namespace, '63');
