import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTableNameFromEventEntity1719565821687 implements MigrationInterface {
  name = 'RemoveTableNameFromEventEntity1719565821687';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_events" DROP COLUMN "table_name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_events" ADD "table_name" character varying`);
  }
}
