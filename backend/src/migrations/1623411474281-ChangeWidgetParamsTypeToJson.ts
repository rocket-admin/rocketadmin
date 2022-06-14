import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeWidgetParamsTypeToJson1623411474281 implements MigrationInterface {
  name = 'ChangeWidgetParamsTypeToJson1623411474281';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_widget" DROP COLUMN "widget_params"`);
    await queryRunner.query(`ALTER TABLE "table_widget" ADD "widget_params" json DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_widget" DROP COLUMN "widget_params"`);
    await queryRunner.query(`ALTER TABLE "table_widget" ADD "widget_params" character varying array`);
  }

}
