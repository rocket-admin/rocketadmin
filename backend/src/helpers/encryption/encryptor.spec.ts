import { EncryptionAlgorithmEnum } from '../../enums';
import { Encryptor } from './encryptor';

describe('Encryptor', () => {
  const testString = 'NeverViewAMainland';
  describe('processDataWithAlgorithm', () => {
    it('should encrypt data with algorithm sha1', async () => {
      const processedData = await Encryptor.processDataWithAlgorithm(testString, EncryptionAlgorithmEnum.sha1);
      expect(processedData).toBe('93b1b6f8c63bc10c9dcce125da79d06be22372ec');
    });

    it('should encrypt data with algorithm sha3', async () => {
      const processedData = await Encryptor.processDataWithAlgorithm(testString, EncryptionAlgorithmEnum.sha3);
      expect(processedData).toBe(
        'fa97f972c43ec6fcd793e62110afdc652b601c4c448da73cf568e2819091059d18f9378dd2888' +
          '483ff3eb8d70b805d0a9fe385a0f09d8f1a286979f15da33026',
      );
    });

    it('should encrypt data with algorithm sha224', async () => {
      const processedData = await Encryptor.processDataWithAlgorithm(testString, EncryptionAlgorithmEnum.sha224);
      expect(processedData).toBe('8aedc17c34b1ad4f6f8c0b634b3dd1a7e823f593b04543a9db86a1ec');
    });

    it('should encrypt data with algorithm sha256', async () => {
      const processedData = await Encryptor.processDataWithAlgorithm(testString, EncryptionAlgorithmEnum.sha256);
      expect(processedData).toBe('8abf6909094891cc035c87e5b0b578fbce1bdd804836ba53ba627d269f24b0b3');
    });

    it('should encrypt data with algorithm sha512', async () => {
      const processedData = await Encryptor.processDataWithAlgorithm(testString, EncryptionAlgorithmEnum.sha512);
      expect(processedData).toBe(
        '84e8e7c30afb8a47a7f1ca602296cf4d8f28dd209899bf0b1ae5eebf282a11effa1792d00ee36' +
          '7d7bca925fcb33834d4ef2263ccdaedeced6e44f40a8ece3fef',
      );
    });

    it('should encrypt data with algorithm sha384', async () => {
      const processedData = await Encryptor.processDataWithAlgorithm(testString, EncryptionAlgorithmEnum.sha384);
      expect(processedData).toBe(
        'cea4f48acd60149fdebfddab8cb8e2653e1c40e1b3afc271fff5effe0b108fad0dc34c7e1ed13' + 'a2c2fec0c81111a7be3',
      );
    });

    it('should encrypt data with algorithm bcrypt', async () => {
      const processedData = await Encryptor.processDataWithAlgorithm(testString, EncryptionAlgorithmEnum.bcrypt);
      expect(processedData.length).toBe(60);
    });

    it('should encrypt data with algorithm scrypt', async () => {
      const processedData = await Encryptor.processDataWithAlgorithm(testString, EncryptionAlgorithmEnum.scrypt);
      expect(processedData.length).toBe(161);
    });

    it('should encrypt data with algorithm argon2', async () => {
      const processedData = await Encryptor.processDataWithAlgorithm(testString, EncryptionAlgorithmEnum.argon2);
      expect(processedData.length).toBe(96);
    });

    it('should encrypt data with algorithm pbkdf2', async () => {
      const processedData = await Encryptor.processDataWithAlgorithm(testString, EncryptionAlgorithmEnum.pbkdf2);
      expect(processedData.length).toBe(64);
    });
  });
});
