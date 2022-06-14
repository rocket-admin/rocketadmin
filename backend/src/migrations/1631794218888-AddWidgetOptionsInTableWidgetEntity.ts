import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWidgetOptionsInTableWidgetEntity1631794218888 implements MigrationInterface {
  name = 'AddWidgetOptionsInTableWidgetEntity1631794218888';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_widget"
        ADD "widget_options" json DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_widget" DROP COLUMN "widget_options"`);
  }

}
