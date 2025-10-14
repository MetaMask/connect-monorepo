import { generateGreeting } from '.';

describe('greetings', () => {
  describe('generateGreeting', () => {
    it('greets', () => {
      const name = 'Huey';
      const result = generateGreeting(name);
      expect(result).toBe('Hello, Huey!');
    });
  });
});
