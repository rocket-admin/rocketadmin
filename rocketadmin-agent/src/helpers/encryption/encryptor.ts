import CryptoJS from 'crypto-js';
import * as argon2 from 'argon2';
import { Messages } from '../../text/messages.js';

export class Encryptor {
  public static encryptDataMasterPwd(data: string, masterPwd: string): string {
    return CryptoJS.AES.encrypt(data, masterPwd).toString();
  }

  public static decryptDataMasterPwd(encryptedData: string, masterPwd: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, masterPwd);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  public static async hashPassword(password: string): Promise<string> {
    return await argon2.hash(password);
  }

  public static async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (err) {
      console.log(Messages.CORRUPTED_DATA);
      process.exit(0);
    }
  }
}
