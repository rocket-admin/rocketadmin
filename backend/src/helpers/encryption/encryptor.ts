import argon2 from 'argon2';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { createHmac, randomBytes, scrypt } from 'crypto';
import CryptoJS from 'crypto-js';
import { EncryptionAlgorithmEnum } from '../../enums/index.js';
import { Constants } from '../constants/constants.js';
import { IEncryptorInterfaceDTO } from './encryptor.interface.js';

export class Encryptor {
  static getPrivateKey(): string {
    return process.env.PRIVATE_KEY;
  }

  static encryptData(data: string): string {
    try {
      const privateKey = this.getPrivateKey();
      return CryptoJS.AES.encrypt(data, privateKey).toString();
    } catch (e) {
      console.log('-> Encryption error', e);
      return data;
    }
  }

  static decryptData(encryptedData: string): string {
    try {
      const privateKey = this.getPrivateKey();
      const bytes = CryptoJS.AES.decrypt(encryptedData, privateKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      throw new Error('Data decryption failed with error: ' + e);
    }
  }

  static encryptDataMasterPwd(data: string, masterPwd: string): string {
    return CryptoJS.AES.encrypt(data, masterPwd).toString();
  }

  static decryptDataMasterPwd(encryptedData: string, masterPwd: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, masterPwd);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      throw new Error('Data decryption with master password failed with error: ' + e);
    }
  }

  static encryptConnectionCredentials(connection: IEncryptorInterfaceDTO, masterPwd: string): IEncryptorInterfaceDTO {
    if (connection.username) connection.username = this.encryptDataMasterPwd(connection.username, masterPwd);
    if (connection.database) connection.database = this.encryptDataMasterPwd(connection.database, masterPwd);
    if (connection.password) connection.password = this.encryptDataMasterPwd(connection.password, masterPwd);

    if (connection.ssh) {
      if (connection.privateSSHKey)
        connection.privateSSHKey = this.encryptDataMasterPwd(connection.privateSSHKey, masterPwd);
      if (connection.sshHost) connection.sshHost = this.encryptDataMasterPwd(connection.sshHost, masterPwd);
      if (connection.sshUsername) connection.sshUsername = this.encryptDataMasterPwd(connection.sshUsername, masterPwd);
    }
    if (connection.ssl) {
      if (connection.cert) connection.cert = this.encryptDataMasterPwd(connection.cert, masterPwd);
    }
    return connection;
  }

  //todo types
  static decryptConnectionCredentials(connection: any, masterPwd: string): any {
    if (connection.username) connection.username = this.decryptDataMasterPwd(connection.username, masterPwd);
    if (connection.database) connection.database = this.decryptDataMasterPwd(connection.database, masterPwd);
    if (connection.password) {
      connection.password = this.decryptDataMasterPwd(connection.password, masterPwd);
    }
    if (connection.ssh) {
      if (connection.privateSSHKey)
        connection.privateSSHKey = this.decryptDataMasterPwd(connection.privateSSHKey, masterPwd);
      if (connection.sshHost) connection.sshHost = this.decryptDataMasterPwd(connection.sshHost, masterPwd);
      if (connection.sshUsername) connection.sshUsername = this.decryptDataMasterPwd(connection.sshUsername, masterPwd);
    }
    if (connection.ssl) {
      if (connection.cert) connection.cert = this.decryptDataMasterPwd(connection.cert, masterPwd);
    }
    return connection;
  }

  static hashDataHMAC(dataToHash: string): string {
    const privateKey = this.getPrivateKey();
    const hmac = createHmac('sha256', privateKey);
    hmac.update(dataToHash);
    return hmac.digest('hex');
  }

  static hashDataHMACexternalKey(key: string, dataToHash: string): string {
    const hmac = createHmac('sha256', key);
    hmac.update(dataToHash);
    return hmac.digest('hex');
  }

  static getUserIntercomHash(userId: string): string | null {
    const intercomKey = process.env.INTERCOM_KEY;
    if (!intercomKey) {
      return null;
    }
    try {
      const hmac = createHmac('sha256', intercomKey);
      hmac.update(userId);
      return hmac.digest('hex');
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  static async processDataWithAlgorithm(data: string, alg: EncryptionAlgorithmEnum): Promise<string> {
    if (!alg) {
      return data;
    }
    try {
      let hash;
      switch (alg) {
        case EncryptionAlgorithmEnum.sha1:
          hash = CryptoJS.SHA1(data);
          return hash.toString(CryptoJS.enc.Hex);

        case EncryptionAlgorithmEnum.sha3:
          hash = CryptoJS.SHA3(data);
          return hash.toString(CryptoJS.enc.Hex);

        case EncryptionAlgorithmEnum.sha256:
          hash = CryptoJS.SHA256(data);
          return hash.toString(CryptoJS.enc.Hex);

        case EncryptionAlgorithmEnum.sha224:
          hash = CryptoJS.SHA224(data);
          return hash.toString(CryptoJS.enc.Hex);

        case EncryptionAlgorithmEnum.sha512:
          hash = CryptoJS.SHA512(data);
          return hash.toString(CryptoJS.enc.Hex);

        case EncryptionAlgorithmEnum.sha384:
          hash = CryptoJS.SHA384(data);
          return hash.toString(CryptoJS.enc.Hex);

        case EncryptionAlgorithmEnum.pbkdf2:
          const salt = CryptoJS.lib.WordArray.random(128 / 8);
          return CryptoJS.PBKDF2(data, salt, {
            keySize: 256 / 32,
          }).toString();

        case EncryptionAlgorithmEnum.bcrypt:
          const bSalt = await bcrypt.genSalt();
          return await bcrypt.hash(data, bSalt);

        case EncryptionAlgorithmEnum.argon2:
          return await argon2.hash(data);

        case EncryptionAlgorithmEnum.scrypt:
          return await Encryptor.scryptHash(data);

        default:
          return data;
      }
    } catch (e) {
      return data;
    }
  }

  static async scryptHash(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = randomBytes(16).toString('hex');
      scrypt(data, salt, 64, (err, derivedData) => {
        if (err) reject(err);
        resolve(salt + ':' + derivedData.toString('hex'));
      });
    });
  }

  static async hashUserPassword(password: string): Promise<string> {
    if (!password || password.length <= 0) return password;
    return new Promise<string>((resolve, reject) => {
      const salt = crypto.randomBytes(Constants.PASSWORD_SALT_LENGTH).toString(Constants.BYTE_TO_STRING_ENCODING);
      crypto.pbkdf2(
        password,
        salt,
        Constants.PASSWORD_HASH_ITERATIONS,
        Constants.PASSWORD_LENGTH,
        Constants.DIGEST,
        (error, hash) => {
          if (error) {
            reject(error);
          } else {
            const result =
              'pbkdf2$' +
              Constants.PASSWORD_HASH_ITERATIONS +
              '$' +
              hash.toString(Constants.BYTE_TO_STRING_ENCODING) +
              '$' +
              salt;
            resolve(result);
          }
        },
      );
    });
  }

  static async verifyUserPassword(receivedPassword: string, hashedPassword: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        const passwordHashParts: Array<string> = hashedPassword.split('$');
        const alg = passwordHashParts[0];
        const iterations = parseInt(passwordHashParts[1]);
        const passwordHash = passwordHashParts[2];
        const salt = passwordHashParts[3];
        if (passwordHashParts.length !== 4 || alg !== 'pbkdf2' || iterations !== Constants.PASSWORD_HASH_ITERATIONS) {
          resolve(false);
        }
        crypto.pbkdf2(
          receivedPassword,
          salt,
          iterations,
          Constants.PASSWORD_LENGTH,
          Constants.DIGEST,
          (error, hash) => {
            if (error) {
              reject(error);
            } else {
              // const result = crypto.timingSafeEqual(Buffer.from(passwordHash), hash);
              const result = passwordHash === hash.toString(Constants.BYTE_TO_STRING_ENCODING);
              resolve(result);
            }
          },
        );
      } catch (e) {
        resolve(false);
      }
    });
  }

  static generateRandomString(size = 20): string {
    return crypto.randomBytes(size).toString('hex');
  }
}
