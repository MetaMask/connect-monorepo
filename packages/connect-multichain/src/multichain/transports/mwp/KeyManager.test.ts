/* eslint-disable id-length -- vitest alias */
import type { IKeyManager } from '@metamask/mobile-wallet-protocol-core';
import * as t from 'vitest';
import { vi } from 'vitest';

import { createKeyManager } from './KeyManager';

const PLAINTEXT = 'hello from the dapp';

/**
 * Exercises every method of the key manager against real `eciesjs`.
 *
 * @param keymanager - The key manager under test.
 * @returns The decrypted plaintext, which should match what was encrypted.
 */
async function roundTrip(keymanager: IKeyManager): Promise<string> {
  const { privateKey, publicKey } = keymanager.generateKeyPair();
  keymanager.validatePeerKey(publicKey);
  const ciphertext = await keymanager.encrypt(PLAINTEXT, publicKey);
  return keymanager.decrypt(ciphertext, privateKey);
}

t.describe('createKeyManager', () => {
  t.it('round-trips with the namespace shape Node resolves', async () => {
    const keymanager = await createKeyManager();

    t.expect(await roundTrip(keymanager)).toBe(PLAINTEXT);
  });

  t.it('round-trips when the import resolves to `{ default }`', async () => {
    // The shape bundlers produce for `eciesjs`, which publishes CommonJS only.
    // Destructuring it directly yields `undefined` for every named export.
    const actual = await vi.importActual('eciesjs');
    vi.resetModules();
    vi.doMock('eciesjs', () => ({ default: actual }));

    try {
      const { createKeyManager: create } = await import('./KeyManager');
      const keymanager = await create();

      t.expect(await roundTrip(keymanager)).toBe(PLAINTEXT);
    } finally {
      vi.doUnmock('eciesjs');
      vi.resetModules();
    }
  });
});
