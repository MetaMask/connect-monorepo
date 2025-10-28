import type { Hex } from '../types';
/**
 * Converts a number or string to a hex string
 *
 * @param value - The value to convert to hex
 * @returns The hex value
 */
export function toHex(value: number | string): Hex {
  // If the value is already a hex string, return it
  if (typeof value === 'string' && value.startsWith('0x')) {
    return value as Hex;
  }

  return `0x${value.toString(16)}`;
}

/**
 * Converts a hex string to a number
 *
 * @param value - The hex value to convert to a number
 * @returns The number value
 */
export function fromHex(value: Hex | undefined): number {
  if (!value || typeof value !== 'string' || !value.startsWith('0x')) {
    throw new Error(`Invalid hex value: ${value}`);
  }

  return Number(value);
}
