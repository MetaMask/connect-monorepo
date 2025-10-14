import { generateSignature } from '.';

describe('signatureHelpers', () => {
  describe('generateSignature', () => {
    it('generates a signature', () => {
      const name = 'Huey';
      const result = generateSignature(name);
      expect(result).toBe('Sincerely, Huey');
    });
  });
});
