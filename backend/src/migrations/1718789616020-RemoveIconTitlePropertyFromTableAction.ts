import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveIconTitlePropertyFromTableAction1718789616020 implements MigrationInterface {
  name = 'RemoveIconTitlePropertyFromTableAction1718789616020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "title"`);
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "icon"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_actions" ADD "icon" character varying`);
    await queryRunner.query(`ALTER TABLE "table_actions" ADD "title" character varying`);
  }
}
