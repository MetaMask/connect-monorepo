/* eslint-disable jsdoc/require-jsdoc */
/*
  QR adapter that hides ESM import details and exposes a sync API.
  Consumers must call preloadQR() once before first use.
*/
import encodeQRImpl from '@paulmillr/qr';

// const encodeQRImpl: ((input: string, type: 'ascii') => string) | null = null;

// type QREncode = (input: string, type: 'ascii') => string;

export async function preloadQR(): Promise<void> {
  // if (encodeQRImpl) {
  //   return;
  // }
  // const mod = (await import('@paulmillr/qr')) as unknown as {
  //   default: QREncode;
  // };
  // encodeQRImpl = mod.default;
}

export function encodeQRSync(input: string): string {
  if (!encodeQRImpl) {
    throw new Error('QR module not preloaded. Call preloadQR() first.');
  }
  return encodeQRImpl(input, 'ascii');
}
