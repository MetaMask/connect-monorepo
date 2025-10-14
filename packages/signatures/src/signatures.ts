/**
 * Generates a signature for use in an email or letter.
 *
 * @param name - The name.
 * @returns The signature.
 */
export function generateSignature(name: string): string {
  return `Sincerely, ${name}`;
}
