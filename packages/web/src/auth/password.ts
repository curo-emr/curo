// Letters and digits that can't be mistaken for one another when read out: no 0/o, 1/l/i.
const READABLE = "abcdefghjkmnpqrstuvwxyz23456789";
const GROUPS = 3;
const GROUP_LENGTH = 4;

/**
 * A random password an admin can read out or pass on, such as "k7mp-x3qa-9tnd":
 * 12 characters from 31 (about 59 bits), in groups of four.
 */
export function generatePassword(): string {
  const picks = crypto.getRandomValues(new Uint32Array(GROUPS * GROUP_LENGTH));
  const chars = Array.from(picks, n => READABLE[n % READABLE.length]);
  return Array.from({ length: GROUPS }, (_, g) => chars.slice(g * GROUP_LENGTH, (g + 1) * GROUP_LENGTH).join("")).join("-");
}
