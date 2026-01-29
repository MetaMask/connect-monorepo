import {
  createLogger,
  enableDebug as debug,
} from '@metamask/connect-multichain';

const namespace = 'metamask-connect:evm';

// @ts-expect-error logger needs to be typed properly
export const logger = createLogger(namespace, '63');

export const enableDebug = (): void => {
  // @ts-expect-error logger needs to be typed properly
  debug(namespace);
};
