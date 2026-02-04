/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
import crypto, { randomBytes } from 'crypto';
import CryptoJS from 'crypto-js';
import argon2 from 'argon2';
import { Messages } from '../../text/messages.js';

const ENCRYPTION_VERSION_PREFIX = '$v2:k1$';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KDF_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

export class Encryptor {
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

	public static encryptDataMasterPwd(data: string, masterPwd: string): string {
		if (data === null || data === undefined) {
			return data;
		}
		return Encryptor.encryptDataV2(data, masterPwd);
	}

	public static decryptDataMasterPwd(encryptedData: string, masterPwd: string): string {
		if (encryptedData === null || encryptedData === undefined) {
			return encryptedData;
		}
		if (Encryptor.isV2Format(encryptedData)) {
			return Encryptor.decryptDataV2(encryptedData, masterPwd);
		}

		return Encryptor.decryptDataV1Legacy(encryptedData, masterPwd);
	}

	public static async hashPassword(password: string): Promise<string> {
		return await argon2.hash(password);
	}

	public static async verifyPassword(hash: string, password: string): Promise<boolean> {
		try {
			return await argon2.verify(hash, password);
		} catch (_err) {
			console.log(Messages.CORRUPTED_DATA);
			process.exit(0);
		}
	}
}
