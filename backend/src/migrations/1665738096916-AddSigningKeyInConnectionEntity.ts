import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSigningKeyInConnectionEntity1665738096916 implements MigrationInterface {
  name = 'AddSigningKeyInConnectionEntity1665738096916';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ADD "signing_key" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "signing_key"`);
  }
}
