import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonalTableSettingsEntityRemovePropertiesFromTableSettingsEntity1762528788423
  implements MigrationInterface
{
  name = 'AddPersonalTableSettingsEntityRemovePropertiesFromTableSettingsEntity1762528788423';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."personal_table_settings_ordering_enum" AS ENUM('ASC', 'DESC')`);
    await queryRunner.query(
      `CREATE TABLE "personal_table_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "table_name" character varying, "ordering" "public"."personal_table_settings_ordering_enum" NOT NULL DEFAULT 'ASC', "ordering_field" character varying, "list_per_page" integer, "list_fields" character varying array NOT NULL DEFAULT '{}', "columns_view" character varying array NOT NULL DEFAULT '{}', "original_names" boolean NOT NULL DEFAULT false, "connection_id" character varying NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_9a4d9b32ced3b0514314a5dc49d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "list_per_page"`);
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "ordering"`);
    await queryRunner.query(`DROP TYPE "public"."tableSettings_ordering_enum"`);
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "list_fields"`);
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "ordering_field"`);
    await queryRunner.query(
      `ALTER TABLE "personal_table_settings" ADD CONSTRAINT "FK_8a64b754616c7c8e5e0e6bc4343" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_table_settings" ADD CONSTRAINT "FK_d9c9dcfd4a151818428a9cf8025" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "personal_table_settings" DROP CONSTRAINT "FK_d9c9dcfd4a151818428a9cf8025"`);
    await queryRunner.query(`ALTER TABLE "personal_table_settings" DROP CONSTRAINT "FK_8a64b754616c7c8e5e0e6bc4343"`);
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "ordering_field" character varying`);
    await queryRunner.query(
      `ALTER TABLE "tableSettings" ADD "list_fields" character varying array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(`CREATE TYPE "public"."tableSettings_ordering_enum" AS ENUM('ASC', 'DESC')`);
    await queryRunner.query(
      `ALTER TABLE "tableSettings" ADD "ordering" "public"."tableSettings_ordering_enum" NOT NULL DEFAULT 'ASC'`,
    );
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "list_per_page" integer`);
    await queryRunner.query(`DROP TABLE "personal_table_settings"`);
    await queryRunner.query(`DROP TYPE "public"."personal_table_settings_ordering_enum"`);
  }
}
