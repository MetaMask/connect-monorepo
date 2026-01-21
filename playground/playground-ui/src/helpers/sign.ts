/**
 * EIP-712 typed data domain configuration.
 */
export type EIP712Domain = {
  chainId: string;
  name: string;
  verifyingContract: string;
  version: string;
};

/**
 * Creates the EIP-712 typed data parameters for eth_signTypedData_v4.
 *
 * @param chainId - The chain ID to use in the domain
 * @returns The typed data message params object
 */
export const createSignTypedDataParams = (chainId: string) => {
  return {
    domain: {
      // Defining the chain aka Sepolia testnet or Ethereum Main Net
      chainId,
      // Give a user-friendly name to the specific contract you are signing for.
      name: 'Ether Mail',
      // If name isn't enough add verifying contract to make sure you are establishing contracts with the proper entity
      verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
      // Just lets you know the latest version. Definitely make sure the field name is correct.
      version: '1',
    },

    message: {
      contents: 'Hello, Bob!',
      attachedMoneyInEth: 4.2,
      from: {
        name: 'Cow',
        wallets: [
          '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
          '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
        ],
      },
      to: [
        {
          name: 'Bob',
          wallets: [
            '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
            '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
            '0xB0B0b0b0b0b0B000000000000000000000000000',
          ],
        },
      ],
    },
    // Refers to the keys of the *types* object below.
    primaryType: 'Mail',
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      // Not an EIP712Domain definition
      Group: [
        { name: 'name', type: 'string' },
        { name: 'members', type: 'Person[]' },
      ],
      // Refer to PrimaryType
      Mail: [
        { name: 'from', type: 'Person' },
        { name: 'to', type: 'Person[]' },
        { name: 'contents', type: 'string' },
      ],
      // Not an EIP712Domain definition
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallets', type: 'address[]' },
      ],
    },
  };
};

/**
 * Converts a message string to a hex-encoded format for personal_sign.
 *
 * @param message - The message to encode
 * @param hexEncoder - Function to convert string to hex (platform-specific)
 * @returns The hex-encoded message with 0x prefix
 */
export const createPersonalSignMessage = (
  message: string,
  hexEncoder: (input: string) => string,
): string => {
  return '0x' + hexEncoder(message);
};

/**
 * Default message for personal_sign in playground applications.
 *
 * @param appName - The name of the application (e.g., "Create React dapp", "React Native playground")
 * @returns The formatted message string
 */
export const getDefaultPersonalSignMessage = (appName: string): string => {
  return `Hello World from the ${appName}!`;
};
