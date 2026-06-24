/* eslint-disable no-restricted-globals -- Buffer is polyfilled for browser/RN environments */
/* eslint-disable @typescript-eslint/await-thenable -- decrypt returns Promise in some implementations */
import type {
  IKeyManager,
  KeyPair,
} from '@metamask/mobile-wallet-protocol-core';

/**
 * Creates an {@link IKeyManager} backed by the `eciesjs` library.
 *
 * The factory dynamically imports `eciesjs` so the heavy crypto dependency is
 * only loaded when MWP transport is actually used. The returned object closes
 * over the imported symbols, allowing synchronous methods like
 * `generateKeyPair` and `validatePeerKey` to work without a second await.
 *
 * @returns A ready-to-use key manager instance.
 */
export async function createKeyManager(): Promise<IKeyManager> {
  const { decrypt, encrypt, PrivateKey, PublicKey } = await import('eciesjs');

  return {
    generateKeyPair(): KeyPair {
      const privateKey = new PrivateKey();
      return {
        privateKey: new Uint8Array(privateKey.secret),
        publicKey: privateKey.publicKey.toBytes(true),
      };
    },

    async encrypt(
      plaintext: string,
      theirPublicKey: Uint8Array,
    ): Promise<string> {
      const plaintextBuffer = Buffer.from(plaintext, 'utf8');
      const encryptedBuffer = encrypt(theirPublicKey, plaintextBuffer);
      return encryptedBuffer.toString('base64');
    },

    async decrypt(
      encryptedB64: string,
      myPrivateKey: Uint8Array,
    ): Promise<string> {
      const encryptedBuffer = Buffer.from(encryptedB64, 'base64');
      const decryptedBuffer = await decrypt(myPrivateKey, encryptedBuffer);
      return Buffer.from(decryptedBuffer).toString('utf8');
    },

    validatePeerKey(key: Uint8Array): void {
      PublicKey.fromHex(Buffer.from(key).toString('hex'));
    },
  };
}
