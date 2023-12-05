import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTablesAuditOptionInConnectionProperties1701692512632 implements MigrationInterface {
  name = 'AddTablesAuditOptionInConnectionProperties1701692512632';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "tables_audit" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "tables_audit"`);
  }
}
