import { generateGreeting } from '@metamask/greetings';
import { generateSignature } from '@metamask/signatures';

/**
 * Example function that crafts a thank-you letter from a greeting and a
 * signature.
 *
 * @param recipientName - The name of the recipient.
 * @param senderName - The name of the sender.
 * @returns The letter.
 */
export function craftThankYouLetter(
  recipientName: string,
  senderName: string,
): string {
  return [
    generateGreeting(recipientName),
    'Thank you for the gift.',
    generateSignature(senderName),
  ].join('\n\n');
}
