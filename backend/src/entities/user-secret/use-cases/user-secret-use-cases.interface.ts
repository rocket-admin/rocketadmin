import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateSecretDS } from '../application/data-structures/create-secret.ds.js';
import { CreatedSecretDS } from '../application/data-structures/created-secret.ds.js';
import { DeleteSecretDS, DeletedSecretDS } from '../application/data-structures/delete-secret.ds.js';
import { FoundSecretDS } from '../application/data-structures/found-secret.ds.js';
import { AuditLogListDS, GetAuditLogDS } from '../application/data-structures/get-audit-log.ds.js';
import { GetSecretDS } from '../application/data-structures/get-secret.ds.js';
import { GetSecretsDS, SecretsListDS } from '../application/data-structures/get-secrets.ds.js';
import { UpdatedSecretDS, UpdateSecretDS } from '../application/data-structures/update-secret.ds.js';

export interface ICreateSecret {
  execute(inputData: CreateSecretDS, inTransaction: InTransactionEnum): Promise<CreatedSecretDS>;
}

export interface IGetSecrets {
  execute(inputData: GetSecretsDS): Promise<SecretsListDS>;
}

export interface IGetSecretBySlug {
  execute(inputData: GetSecretDS): Promise<FoundSecretDS>;
}

export interface IUpdateSecret {
  execute(inputData: UpdateSecretDS, inTransaction: InTransactionEnum): Promise<UpdatedSecretDS>;
}

export interface IDeleteSecret {
  execute(inputData: DeleteSecretDS, inTransaction: InTransactionEnum): Promise<DeletedSecretDS>;
}

export interface IGetSecretAuditLog {
  execute(inputData: GetAuditLogDS): Promise<AuditLogListDS>;
}
