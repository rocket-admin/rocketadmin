import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTableInfoEntity1658913681818 implements MigrationInterface {
  name = 'AddTableInfoEntity1658913681818';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "table_field_info" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "allow_null" boolean, "character_maximum_length" integer, "column_default" character varying, "column_name" character varying, "data_type" character varying, "data_type_params" character varying, "udt_name" character varying, "tableInfoId" uuid, CONSTRAINT "PK_88bed139d648523aad1df46d6ff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "table_info" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "table_name" character varying NOT NULL, "connectionId" uuid, CONSTRAINT "PK_4dc62b1f8615f01359c4ebbc188" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "connection" ADD "saved_table_info" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(
      `ALTER TABLE "table_field_info" ADD CONSTRAINT "FK_e955c1750aa76b5691c5044d30c" FOREIGN KEY ("tableInfoId") REFERENCES "table_info"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_info" ADD CONSTRAINT "FK_0b9cf14b1a4c562a84eae8f70f2" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_info" DROP CONSTRAINT "FK_0b9cf14b1a4c562a84eae8f70f2"`);
    await queryRunner.query(`ALTER TABLE "table_field_info" DROP CONSTRAINT "FK_e955c1750aa76b5691c5044d30c"`);
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "saved_table_info"`);
    await queryRunner.query(`DROP TABLE "table_info"`);
    await queryRunner.query(`DROP TABLE "table_field_info"`);
  }
}
