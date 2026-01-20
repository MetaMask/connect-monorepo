import type { EIP1193Provider } from '@metamask/connect-evm';
import { Buffer } from 'buffer';
import {
  createSignTypedDataParams,
  getDefaultPersonalSignMessage,
} from '@metamask/playground-ui/helpers';

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
      return 'Error: Invalid account -- please connect using eth_requestAccounts first';
    }

    const params = [from, msgParams];
    const method = 'eth_signTypedData_v4';
    console.debug(`ethRequest ${method}`, JSON.stringify(params, null, 4));
    console.debug(`sign params`, params);
    return await provider?.request({ method, params });
  } catch (e: unknown) {
    console.log(`eth_signTypedData_v4 error: ${e}`);
    return 'Error: ' + e;
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
    const message = getDefaultPersonalSignMessage('React Native playground');
    const hexMessage = '0x' + Buffer.from(message, 'utf8').toString('hex');

    const sign = await provider.request({
      method: 'personal_sign',
      params: [hexMessage, from, 'Example password'],
    });
    return sign;
  } catch (err: unknown) {
    console.log(`personal_sign error: ${err}`);
    return 'Error: ' + err;
  }
};
