import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTableTriggersEntity1716974043937 implements MigrationInterface {
  name = 'AddTableTriggersEntity1716974043937';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."table_triggers_trigger_events_enum" AS ENUM('ADD_ROW', 'UPDATE_ROW', 'DELETE_ROW')`,
    );
    await queryRunner.query(
      `CREATE TABLE "table_triggers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "table_name" character varying, "created_at" TIMESTAMP, "trigger_events" "public"."table_triggers_trigger_events_enum" array NOT NULL DEFAULT '{ADD_ROW}', "connectionId" uuid, CONSTRAINT "PK_e5b00855e953fa2066943ac41b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_triggers" ADD CONSTRAINT "FK_937487c7a49aefc776beb196f42" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_triggers" DROP CONSTRAINT "FK_937487c7a49aefc776beb196f42"`);
    await queryRunner.query(`DROP TABLE "table_triggers"`);
    await queryRunner.query(`DROP TYPE "public"."table_triggers_trigger_events_enum"`);
  }
}
