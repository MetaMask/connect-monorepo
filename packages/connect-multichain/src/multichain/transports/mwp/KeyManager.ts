import type {
  IKeyManager,
  KeyPair,
} from '@metamask/mobile-wallet-protocol-core';
import { decrypt, encrypt, PrivateKey } from 'eciesjs';

/**
 * Encodes a string to a Uint8Array using UTF-8 encoding.
 * Works in browser, Node.js, and React Native environments.
 *
 * @param str - The string to encode
 * @returns The UTF-8 encoded Uint8Array
 */
function stringToUtf8Bytes(str: string): Uint8Array {
  // Browser and modern Node.js (v12+)
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }

  // Node.js and React Native with Buffer polyfill
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(str, 'utf8'));
  }

  throw new Error(
    'No UTF-8 encoding method available. Install a Buffer polyfill for React Native.',
  );
}

/**
 * Decodes a Uint8Array to a string using UTF-8 decoding.
 * Works in browser, Node.js, and React Native environments.
 *
 * @param bytes - The Uint8Array to decode
 * @returns The decoded string
 */
function utf8BytesToString(bytes: Uint8Array): string {
  // Browser and modern Node.js (v12+)
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes);
  }

  // Node.js and React Native with Buffer polyfill
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('utf8');
  }

  throw new Error(
    'No UTF-8 decoding method available. Install a Buffer polyfill for React Native.',
  );
}

/**
 * Encodes a Uint8Array to a base64 string.
 * Works in browser, Node.js, and React Native environments.
 *
 * @param bytes - The Uint8Array to encode
 * @returns The base64 encoded string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Browser and React Native with btoa polyfill
  if (typeof btoa !== 'undefined') {
    // Convert Uint8Array to binary string
    const binaryString = Array.from(bytes, (byte) =>
      String.fromCharCode(byte),
    ).join('');
    return btoa(binaryString);
  }

  // Node.js and React Native with Buffer polyfill
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  throw new Error(
    'No base64 encoding method available. Install a Buffer polyfill for React Native.',
  );
}

/**
 * Decodes a base64 string to a Uint8Array.
 * Works in browser, Node.js, and React Native environments.
 *
 * @param base64 - The base64 string to decode
 * @returns The decoded Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Browser and React Native with atob polyfill
  if (typeof atob !== 'undefined') {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Node.js and React Native with Buffer polyfill
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  throw new Error(
    'No base64 decoding method available. Install a Buffer polyfill for React Native.',
  );
}

class KeyManager implements IKeyManager {
  generateKeyPair(): KeyPair {
    const privateKey = new PrivateKey();
    return {
      privateKey: new Uint8Array(privateKey.secret),
      publicKey: privateKey.publicKey.toBytes(true),
    };
  }

  async encrypt(
    plaintext: string,
    theirPublicKey: Uint8Array,
  ): Promise<string> {
    const plaintextBytes = stringToUtf8Bytes(plaintext);
    const encryptedBytes = encrypt(theirPublicKey, plaintextBytes);
    return uint8ArrayToBase64(encryptedBytes);
  }

  async decrypt(
    encryptedB64: string,
    myPrivateKey: Uint8Array,
  ): Promise<string> {
    const encryptedBytes = base64ToUint8Array(encryptedB64);
    const decryptedBytes = await decrypt(myPrivateKey, encryptedBytes);
    return utf8BytesToString(decryptedBytes);
  }
}

export const keymanager = new KeyManager();
