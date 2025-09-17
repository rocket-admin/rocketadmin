import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTableCategoriesEntity1758113168067 implements MigrationInterface {
  name = 'AddTableCategoriesEntity1758113168067';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "table_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category_name" character varying(255) NOT NULL, "tables" character varying array, "connection_properties_id" uuid NOT NULL, CONSTRAINT "PK_25ba8fc29388a10d70db9e0d3d0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_categories" ADD CONSTRAINT "FK_05bd0df6a5f40f4a992b9821e98" FOREIGN KEY ("connection_properties_id") REFERENCES "connectionProperties"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_categories" DROP CONSTRAINT "FK_05bd0df6a5f40f4a992b9821e98"`);
    await queryRunner.query(`DROP TABLE "table_categories"`);
  }
}
