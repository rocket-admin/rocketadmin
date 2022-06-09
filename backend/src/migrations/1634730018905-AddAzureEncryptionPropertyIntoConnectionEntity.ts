import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAzureEncryptionPropertyIntoConnectionEntity1634730018905 implements MigrationInterface {
  name = 'AddAzureEncryptionPropertyIntoConnectionEntity1634730018905';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection"
        ADD "azure_encryption" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "azure_encryption"`);
  }
}
