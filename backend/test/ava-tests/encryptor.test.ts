import test from 'ava';
import CryptoJS from 'crypto-js';

process.env.PRIVATE_KEY = 'test-private-key-12345';

const { Encryptor } = await import('../../src/helpers/encryption/encryptor.js');

const TEST_DATA = 'Hello, World! This is sensitive data.';
const TEST_MASTER_PWD = 'my-secure-master-password-123';
const TEST_SPECIAL_CHARS = 'Special chars: !@#$%^&*()_+-=[]{}|;\':",./<>?`~ and unicode: 你好世界 🔐';
const TEST_LONG_DATA = 'A'.repeat(10000);
const TEST_EMPTY_STRING = '';

test('encryptData: should encrypt and produce V2 format with version prefix', (t) => {
	const encrypted = Encryptor.encryptData(TEST_DATA);

	t.true(encrypted.startsWith('$v2:k1$'), 'Should start with V2 version prefix');
	t.true(encrypted.includes('.'), 'Should contain dot separators');

	const parts = encrypted.substring('$v2:k1$'.length).split('.');
	t.is(parts.length, 4, 'Should have 4 parts: salt, iv, authTag, ciphertext');
});

test('encryptData + decryptData: should round-trip correctly with V2 format', (t) => {
	const encrypted = Encryptor.encryptData(TEST_DATA);
	const decrypted = Encryptor.decryptData(encrypted);

	t.is(decrypted, TEST_DATA);
});

test('encryptDataMasterPwd + decryptDataMasterPwd: should round-trip correctly', (t) => {
	const encrypted = Encryptor.encryptDataMasterPwd(TEST_DATA, TEST_MASTER_PWD);
	const decrypted = Encryptor.decryptDataMasterPwd(encrypted, TEST_MASTER_PWD);

	t.is(decrypted, TEST_DATA);
	t.true(encrypted.startsWith('$v2:k1$'), 'Should use V2 format');
});

test('encryptData: each encryption should produce unique ciphertext (random salt/IV)', (t) => {
	const encrypted1 = Encryptor.encryptData(TEST_DATA);
	const encrypted2 = Encryptor.encryptData(TEST_DATA);

	t.not(encrypted1, encrypted2, 'Same plaintext should produce different ciphertext');

	t.is(Encryptor.decryptData(encrypted1), TEST_DATA);
	t.is(Encryptor.decryptData(encrypted2), TEST_DATA);
});

test('encryptData: should handle special characters and unicode', (t) => {
	const encrypted = Encryptor.encryptData(TEST_SPECIAL_CHARS);
	const decrypted = Encryptor.decryptData(encrypted);

	t.is(decrypted, TEST_SPECIAL_CHARS);
});

test('encryptData: should handle long data', (t) => {
	const encrypted = Encryptor.encryptData(TEST_LONG_DATA);
	const decrypted = Encryptor.decryptData(encrypted);

	t.is(decrypted, TEST_LONG_DATA);
	t.is(decrypted.length, 10000);
});

test('encryptData: should handle empty string', (t) => {
	const encrypted = Encryptor.encryptData(TEST_EMPTY_STRING);
	const decrypted = Encryptor.decryptData(encrypted);

	t.is(decrypted, TEST_EMPTY_STRING);
});

test('decryptData: should decrypt legacy V1 (CryptoJS) encrypted data', (t) => {
	const legacyEncrypted = CryptoJS.AES.encrypt(TEST_DATA, process.env.PRIVATE_KEY).toString();
	t.false(legacyEncrypted.startsWith('$v2:'), 'Legacy format should not have V2 prefix');

	const decrypted = Encryptor.decryptData(legacyEncrypted);

	t.is(decrypted, TEST_DATA, 'Should decrypt legacy V1 data correctly');
});

test('decryptDataMasterPwd: should decrypt legacy V1 (CryptoJS) encrypted data', (t) => {
	const legacyEncrypted = CryptoJS.AES.encrypt(TEST_DATA, TEST_MASTER_PWD).toString();
	t.false(legacyEncrypted.startsWith('$v2:'), 'Legacy format should not have V2 prefix');

	const decrypted = Encryptor.decryptDataMasterPwd(legacyEncrypted, TEST_MASTER_PWD);

	t.is(decrypted, TEST_DATA, 'Should decrypt legacy V1 data correctly');
});

test('decryptData: should handle legacy V1 data with special characters', (t) => {
	const legacyEncrypted = CryptoJS.AES.encrypt(TEST_SPECIAL_CHARS, process.env.PRIVATE_KEY).toString();
	const decrypted = Encryptor.decryptData(legacyEncrypted);

	t.is(decrypted, TEST_SPECIAL_CHARS);
});

test('decryptData: should throw error for invalid V2 format', (t) => {
	const invalidV2 = '$v2:k1$invaliddata';

	const error = t.throws(() => {
		Encryptor.decryptData(invalidV2);
	});

	t.true(error.message.includes('Invalid V2 encrypted data format') || error.message.includes('decryption failed'));
});

test('decryptData: should throw error for corrupted V2 ciphertext', (t) => {
	// Create valid encrypted data then corrupt it
	const encrypted = Encryptor.encryptData(TEST_DATA);
	const corrupted = encrypted.slice(0, -5) + 'XXXXX';

	const error = t.throws(() => {
		Encryptor.decryptData(corrupted);
	});

	t.truthy(error);
});

test('decryptDataMasterPwd: should throw error with wrong password', (t) => {
	const encrypted = Encryptor.encryptDataMasterPwd(TEST_DATA, TEST_MASTER_PWD);

	const error = t.throws(() => {
		Encryptor.decryptDataMasterPwd(encrypted, 'wrong-password');
	});

	t.truthy(error);
});

test('lazy re-encryption: V1 data decrypted then re-encrypted becomes V2', (t) => {
	// Step 1: Create V1 encrypted data (simulating production data)
	const v1Encrypted = CryptoJS.AES.encrypt(TEST_DATA, process.env.PRIVATE_KEY).toString();
	t.false(v1Encrypted.startsWith('$v2:'), 'Should be V1 format');

	// Step 2: Decrypt using new method (backward compatible)
	const decrypted = Encryptor.decryptData(v1Encrypted);
	t.is(decrypted, TEST_DATA);

	// Step 3: Re-encrypt using new method (always V2)
	const v2Encrypted = Encryptor.encryptData(decrypted);
	t.true(v2Encrypted.startsWith('$v2:k1$'), 'Should now be V2 format');

	// Step 4: Verify V2 encrypted data can be decrypted
	const decryptedAgain = Encryptor.decryptData(v2Encrypted);
	t.is(decryptedAgain, TEST_DATA);
});

test('generateRandomString: should generate hex string of correct length', (t) => {
	const str1 = Encryptor.generateRandomString();
	const str2 = Encryptor.generateRandomString(30);

	t.is(str1.length, 40, 'Default size 20 bytes = 40 hex chars');
	t.is(str2.length, 60, 'Size 30 bytes = 60 hex chars');
	t.not(str1, str2, 'Should be random');
});

test('generateUUID: should generate valid UUID format', (t) => {
	const uuid = Encryptor.generateUUID();

	t.regex(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

test('generateApiKey: should generate key with sk_ prefix', (t) => {
	const apiKey = Encryptor.generateApiKey();

	t.true(apiKey.startsWith('sk_'));
	t.is(apiKey.length, 75, 'sk_ (3) + 72 hex chars (36 bytes)');
});

test('hashDataHMAC: should produce consistent hash for same input', (t) => {
	const hash1 = Encryptor.hashDataHMAC('test-data');
	const hash2 = Encryptor.hashDataHMAC('test-data');

	t.is(hash1, hash2);
	t.is(hash1.length, 64, 'SHA-256 produces 64 hex chars');
});

test('hashDataHMAC: should produce different hash for different input', (t) => {
	const hash1 = Encryptor.hashDataHMAC('test-data-1');
	const hash2 = Encryptor.hashDataHMAC('test-data-2');

	t.not(hash1, hash2);
});

test('hashUserPassword + verifyUserPassword: should hash and verify correctly', async (t) => {
	const password = 'my-secure-password-123';
	const hashedPassword = await Encryptor.hashUserPassword(password);

	t.true(hashedPassword.startsWith('pbkdf2$'));

	const isValid = await Encryptor.verifyUserPassword(password, hashedPassword);
	t.true(isValid);

	const isInvalid = await Encryptor.verifyUserPassword('wrong-password', hashedPassword);
	t.false(isInvalid);
});

test('hashUserPassword: should return empty string for empty password', async (t) => {
	const result = await Encryptor.hashUserPassword('');

	t.is(result, '');
});
