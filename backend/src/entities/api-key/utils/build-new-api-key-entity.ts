import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { UserApiKeyEntity } from '../api-key.entity.js';
import { CreateApiKeyDS } from '../application/data-structures/create-api-key.ds.js';

export function buildNewApiKeyEntity(keyData: CreateApiKeyDS): UserApiKeyEntity {
  const newApiKey = new UserApiKeyEntity();
  newApiKey.title = keyData.title;
  newApiKey.hash = Encryptor.generateApiKey();
  return newApiKey;
}
