import { Encryptor } from '../../../helpers/encryption/encryptor';

export function getUserIntercomHash(userId: string): string | null {
  if (!userId) return null;
  return Encryptor.getUserIntercomHash(userId);
}
