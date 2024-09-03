import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAffectedPrimaryKeyInTableLogsEntity1725359728220 implements MigrationInterface {
  name = 'AddAffectedPrimaryKeyInTableLogsEntity1725359728220';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableLogs" ADD "affected_primary_key" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableLogs" DROP COLUMN "affected_primary_key"`);
  }
}
