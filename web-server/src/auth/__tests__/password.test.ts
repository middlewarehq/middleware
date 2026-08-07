import { hashPassword, verifyPassword } from '@/auth/password';

describe('password', () => {
  it('produces a hash that is not the plaintext', async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(hash).not.toBe('correct-horse-battery');
    expect(hash.length).toBeGreaterThan(50);
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct-horse-battery');
    await expect(verifyPassword('correct-horse-battery', hash)).resolves.toBe(
      true
    );
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-horse-battery');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('produces different hashes for the same input (salted)', async () => {
    const a = await hashPassword('same-input');
    const b = await hashPassword('same-input');
    expect(a).not.toBe(b);
  });

  it('returns false rather than throwing on a malformed hash', async () => {
    await expect(verifyPassword('anything', 'not-a-hash')).resolves.toBe(false);
  });
});
