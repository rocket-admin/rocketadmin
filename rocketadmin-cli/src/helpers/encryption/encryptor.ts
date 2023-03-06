import CryptoJS from 'crypto-js';
import crypto from 'crypto';

export class Encryptor {
  public static encryptDataMasterPwd(data: string, masterPwd: string): string {
    return CryptoJS.AES.encrypt(data, masterPwd).toString();
  }

  public static decryptDataMasterPwd(encryptedData: string, masterPwd: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, masterPwd);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  public static async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(8).toString('hex');
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(salt + ':' + derivedKey.toString('hex'));
      });
    });
  }

  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(key == derivedKey.toString('hex'));
      });
    });
  }
}
