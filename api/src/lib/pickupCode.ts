import { randomInt } from 'crypto';

// No 0/O or 1/I, so codes are easy to read out at the desk
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePickupCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}