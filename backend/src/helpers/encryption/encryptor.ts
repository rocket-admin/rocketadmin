/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
import argon2 from 'argon2';
import bcrypt from 'bcrypt';
import crypto, { createHmac, randomBytes, scrypt } from 'crypto';
import CryptoJS from 'crypto-js';
import { ConnectionEntity } from '../../entities/connection/connection.entity.js';
import { EncryptionAlgorithmEnum } from '../../enums/index.js';
import { Constants } from '../constants/constants.js';

const ENCRYPTION_VERSION_PREFIX = '$v2:k1$';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KDF_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

export class Encryptor {
	static getPrivateKey(): string {
		return process.env.PRIVATE_KEY;
	}

	private static deriveKey(passphrase: string, salt: Buffer): Buffer {
		return crypto.pbkdf2Sync(passphrase, salt, KDF_ITERATIONS, KEY_LENGTH, 'sha256');
	}

	private static encryptDataV2(data: string, passphrase: string): string {
		const salt = randomBytes(SALT_LENGTH);
		const iv = randomBytes(IV_LENGTH);
		const key = Encryptor.deriveKey(passphrase, salt);

		const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
		const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
		const authTag = cipher.getAuthTag();

		const saltB64 = salt.toString('base64');
		const ivB64 = iv.toString('base64');
		const authTagB64 = authTag.toString('base64');
		const encryptedB64 = encrypted.toString('base64');

		return `${ENCRYPTION_VERSION_PREFIX}${saltB64}.${ivB64}.${authTagB64}.${encryptedB64}`;
	}

	private static decryptDataV2(encryptedData: string, passphrase: string): string {
		const dataWithoutPrefix = encryptedData.substring(ENCRYPTION_VERSION_PREFIX.length);
		const parts = dataWithoutPrefix.split('.');
		if (parts.length !== 4) {
			throw new Error('Invalid V2 encrypted data format');
		}
		const [saltB64, ivB64, authTagB64, encryptedB64] = parts;
		const salt = Buffer.from(saltB64, 'base64');
		const iv = Buffer.from(ivB64, 'base64');
		const authTag = Buffer.from(authTagB64, 'base64');
		const encrypted = Buffer.from(encryptedB64, 'base64');
		const key = Encryptor.deriveKey(passphrase, salt);
		const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);
		const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
		return decrypted.toString('utf8');
	}

	private static decryptDataV1Legacy(encryptedData: string, passphrase: string): string {
		const bytes = CryptoJS.AES.decrypt(encryptedData, passphrase);
		return bytes.toString(CryptoJS.enc.Utf8);
	}

	private static isV2Format(encryptedData: string): boolean {
		return encryptedData.startsWith('$v2:');
	}

	static encryptData(data: string): string {
		if (data === null || data === undefined) {
			return data;
		}
		try {
			const privateKey = Encryptor.getPrivateKey();
			return Encryptor.encryptDataV2(data, privateKey);
		} catch (e) {
			console.log('-> Encryption error', e);
			return data;
		}
	}

	static decryptData(encryptedData: string): string {
		if (encryptedData === null || encryptedData === undefined) {
			return encryptedData;
		}
		try {
			const privateKey = Encryptor.getPrivateKey();

			if (Encryptor.isV2Format(encryptedData)) {
				return Encryptor.decryptDataV2(encryptedData, privateKey);
			}

			return Encryptor.decryptDataV1Legacy(encryptedData, privateKey);
		} catch (e) {
			throw new Error('Data decryption failed with error: ' + e);
		}
	}

	static encryptDataMasterPwd(data: string, masterPwd: string): string {
		if (data === null || data === undefined) {
			return data;
		}
		return Encryptor.encryptDataV2(data, masterPwd);
	}

	static decryptDataMasterPwd(encryptedData: string, masterPwd: string): string {
		if (encryptedData === null || encryptedData === undefined) {
			return encryptedData;
		}
		try {
			if (Encryptor.isV2Format(encryptedData)) {
				return Encryptor.decryptDataV2(encryptedData, masterPwd);
			}

			return Encryptor.decryptDataV1Legacy(encryptedData, masterPwd);
		} catch (e) {
			throw new Error('Data decryption with master password failed with error: ' + e);
		}
	}

	static encryptConnectionCredentials(connection: ConnectionEntity, masterPwd: string): ConnectionEntity {
		if (connection.username) connection.username = Encryptor.encryptDataMasterPwd(connection.username, masterPwd);
		if (connection.database) connection.database = Encryptor.encryptDataMasterPwd(connection.database, masterPwd);
		if (connection.password) connection.password = Encryptor.encryptDataMasterPwd(connection.password, masterPwd);
		if (connection.authSource) connection.authSource = Encryptor.encryptDataMasterPwd(connection.authSource, masterPwd);
		if (connection.ssh) {
			if (connection.privateSSHKey)
				connection.privateSSHKey = Encryptor.encryptDataMasterPwd(connection.privateSSHKey, masterPwd);
			if (connection.sshHost) connection.sshHost = Encryptor.encryptDataMasterPwd(connection.sshHost, masterPwd);
			if (connection.sshUsername)
				connection.sshUsername = Encryptor.encryptDataMasterPwd(connection.sshUsername, masterPwd);
		}
		if (connection.ssl) {
			if (connection.cert) connection.cert = Encryptor.encryptDataMasterPwd(connection.cert, masterPwd);
		}
		return connection;
	}

	static decryptConnectionCredentials(connection: ConnectionEntity, masterPwd: string): ConnectionEntity {
		if (connection.username) connection.username = Encryptor.decryptDataMasterPwd(connection.username, masterPwd);
		if (connection.database) connection.database = Encryptor.decryptDataMasterPwd(connection.database, masterPwd);
		if (connection.password) {
			connection.password = Encryptor.decryptDataMasterPwd(connection.password, masterPwd);
		}
		if (connection.authSource) connection.authSource = Encryptor.decryptDataMasterPwd(connection.authSource, masterPwd);
		if (connection.ssh) {
			if (connection.privateSSHKey)
				connection.privateSSHKey = Encryptor.decryptDataMasterPwd(connection.privateSSHKey, masterPwd);
			if (connection.sshHost) connection.sshHost = Encryptor.decryptDataMasterPwd(connection.sshHost, masterPwd);
			if (connection.sshUsername)
				connection.sshUsername = Encryptor.decryptDataMasterPwd(connection.sshUsername, masterPwd);
		}
		if (connection.ssl) {
			if (connection.cert) connection.cert = Encryptor.decryptDataMasterPwd(connection.cert, masterPwd);
		}
		return connection;
	}

	static hashDataHMAC(dataToHash: string): string {
		const privateKey = Encryptor.getPrivateKey();
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

				case EncryptionAlgorithmEnum.pbkdf2: {
					const salt = CryptoJS.lib.WordArray.random(128 / 8);
					return CryptoJS.PBKDF2(data, salt, {
						keySize: 256 / 32,
					}).toString();
				}

				case EncryptionAlgorithmEnum.bcrypt: {
					const bSalt = await bcrypt.genSalt();
					return await bcrypt.hash(data, bSalt);
				}

				case EncryptionAlgorithmEnum.argon2:
					return await argon2.hash(data);

				case EncryptionAlgorithmEnum.scrypt:
					return await Encryptor.scryptHash(data);

				default:
					return data;
			}
		} catch (_e) {
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
				const iterations = parseInt(passwordHashParts[1], 10);
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
							try {
								const hashToString = hash.toString(Constants.BYTE_TO_STRING_ENCODING);
								const result = crypto.timingSafeEqual(Buffer.from(passwordHash), Buffer.from(hashToString));
								resolve(result);
							} catch (_e) {
								resolve(false);
							}
						}
					},
				);
			} catch (_e) {
				resolve(false);
			}
		});
	}

	static generateRandomString(size = 20): string {
		return crypto.randomBytes(size).toString('hex');
	}

	static generateUUID(): string {
		return crypto.randomUUID();
	}

	static generateApiKey(): string {
		const generatedString = crypto.randomBytes(36).toString('hex');
		return `sk_${generatedString}`;
	}
}
