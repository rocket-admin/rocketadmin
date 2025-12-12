import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryColorPropertyAndCategoryIdToTableCategoriesEntity1761305606579 implements MigrationInterface {
  name = 'AddCategoryColorPropertyAndCategoryIdToTableCategoriesEntity1761305606579';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_categories" ADD "category_id" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "table_categories" ADD "category_color" character varying(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_categories" DROP COLUMN "category_color"`);
    await queryRunner.query(`ALTER TABLE "table_categories" DROP COLUMN "category_id"`);
  }
}
