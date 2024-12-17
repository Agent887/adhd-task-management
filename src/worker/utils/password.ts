import { hash, verify } from '@node-rs/bcrypt';

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await verify(password, hashedPassword);
}
