import { compare, hash } from 'bcryptjs';

const COST = 12;

export const hashPassword = (plain: string): Promise<string> =>
  hash(plain, COST);

export const verifyPassword = async (
  plain: string,
  passwordHash: string
): Promise<boolean> => {
  try {
    return await compare(plain, passwordHash);
  } catch {
    // A malformed stored hash must read as "wrong password", never as an
    // exception that a caller might treat as success.
    return false;
  }
};
