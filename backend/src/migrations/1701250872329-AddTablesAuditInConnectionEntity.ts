import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTablesAuditInConnectionEntity1701250872329 implements MigrationInterface {
  name = 'AddTablesAuditInConnectionEntity1701250872329';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ADD "tables_audit" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "tables_audit"`);
  }
}
