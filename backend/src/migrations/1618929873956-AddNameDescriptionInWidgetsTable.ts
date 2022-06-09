import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameDescriptionInWidgetsTable1618929873956 implements MigrationInterface {
  name = 'AddNameDescriptionInWidgetsTable1618929873956';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_widget" ADD "name" character varying DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "table_widget" ADD "description" character varying DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_widget" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "table_widget" DROP COLUMN "name"`);
  }

}
