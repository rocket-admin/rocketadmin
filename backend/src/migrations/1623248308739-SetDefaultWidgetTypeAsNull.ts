import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultWidgetTypeAsNull1623248308739 implements MigrationInterface {
  name = 'SetDefaultWidgetTypeAsNull1623248308739';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_widget" ALTER COLUMN "widget_type" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "table_widget" ALTER COLUMN "widget_type" SET DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_widget" ALTER COLUMN "widget_type" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "table_widget" ALTER COLUMN "widget_type" SET NOT NULL`);
  }

}
