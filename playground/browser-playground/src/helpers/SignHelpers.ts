/* eslint-disable @typescript-eslint/naming-convention -- Method names match RPC methods */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Demo helpers */
/* eslint-disable id-denylist -- 'err' is clear in catch context */
/* eslint-disable @typescript-eslint/restrict-template-expressions -- Error logging */
/* eslint-disable no-alert -- Browser playground uses alert */
/* eslint-disable no-restricted-globals -- Browser uses alert for feedback */
/* eslint-disable consistent-return -- Error handling */
/* eslint-disable id-length -- Short error variable */
/* eslint-disable camelcase -- RPC method names */
/* eslint-disable import-x/no-nodejs-modules -- Buffer polyfill */
import type { EIP1193Provider } from '@metamask/connect/evm';
import {
  createSignTypedDataParams,
  getDefaultPersonalSignMessage,
} from '@metamask/playground-ui/helpers';
import { Buffer } from 'buffer';

/**
 * Sends an eth_signTypedData_v4 request to the provider.
 *
 * @param provider - The EIP-1193 provider
 * @param chainId - The chain ID to use in the typed data domain
 * @returns The signature result or an error string
 */
export const send_eth_signTypedData_v4 = async (
  provider: EIP1193Provider,
  chainId: string,
) => {
  const msgParams = JSON.stringify(createSignTypedDataParams(chainId));

  const from = provider.selectedAccount;

  console.debug(`sign from: ${from}`);
  try {
    if (!from) {
      alert(
        `Invalid account -- please connect using eth_requestAccounts first`,
      );
      return;
    }

    const params = [from, msgParams];
    const method = 'eth_signTypedData_v4';
    console.debug(`ethRequest ${method}`, JSON.stringify(params, null, 4));
    console.debug(`sign params`, params);
    return await provider?.request({ method, params });
  } catch (e: unknown) {
    console.log(`eth_signTypedData_v4 error: ${e}`);
    return `Error: ${e}`;
  }
};

/**
 * Sends a personal_sign request to the provider.
 *
 * @param provider - The EIP-1193 provider
 * @returns The signature result or an error string
 */
export const send_personal_sign = async (provider: EIP1193Provider) => {
  try {
    const from = provider.selectedAccount;
    const message = getDefaultPersonalSignMessage('Create React dapp');
    const hexMessage = `0x${Buffer.from(message, 'utf8').toString('hex')}`;

    const sign = await provider.request({
      method: 'personal_sign',
      params: [hexMessage, from, 'Example password'],
    });
    return sign;
  } catch (err: unknown) {
    console.log(`personal_sign error: ${err}`);
    return `Error: ${err}`;
  }
};
