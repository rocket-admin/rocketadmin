import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOldDataFieldIntoTableLogsEntity1620130292385 implements MigrationInterface {
  name = 'AddOldDataFieldIntoTableLogsEntity1620130292385';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableLogs" ADD "old_data" character varying DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableLogs" DROP COLUMN "old_data"`);
  }

}
