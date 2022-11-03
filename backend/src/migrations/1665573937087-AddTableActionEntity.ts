import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTableActionEntity1665573937087 implements MigrationInterface {
  name = 'AddTableActionEntity1665573937087';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."table_actions_type_enum" AS ENUM('single', 'multiple')`);
    await queryRunner.query(
      `CREATE TABLE "table_actions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying, "type" "public"."table_actions_type_enum" NOT NULL DEFAULT 'single', "url" character varying, "settingsId" uuid, CONSTRAINT "PK_56c3f0c6b43b21727d181744f5c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_actions" ADD CONSTRAINT "FK_e6cbca5311c836511e42ff3477c" FOREIGN KEY ("settingsId") REFERENCES "tableSettings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_actions" DROP CONSTRAINT "FK_e6cbca5311c836511e42ff3477c"`);
    await queryRunner.query(`DROP TABLE "table_actions"`);
    await queryRunner.query(`DROP TYPE "public"."table_actions_type_enum"`);
  }
}
