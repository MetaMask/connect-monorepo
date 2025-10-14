import { craftThankYouLetter } from '.';

describe('letter-crafter', () => {
  describe('craftThankYouLetter', () => {
    it('crafts a thank you letter', () => {
      const result = craftThankYouLetter('Huey', 'Louie');
      expect(result).toBe(
        'Hello, Huey!\n\nThank you for the gift.\n\nSincerely, Louie',
      );
    });
  });
});
