import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTableTriggersEntity1717155859650 implements MigrationInterface {
  name = 'AddTableTriggersEntity1717155859650';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."table_triggers_trigger_events_enum" AS ENUM('ADD_ROW', 'UPDATE_ROW', 'DELETE_ROW')`,
    );
    await queryRunner.query(
      `CREATE TABLE "table_triggers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "table_name" character varying, "created_at" TIMESTAMP, "trigger_events" "public"."table_triggers_trigger_events_enum" array NOT NULL DEFAULT '{ADD_ROW}', "connectionId" uuid, CONSTRAINT "PK_e5b00855e953fa2066943ac41b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "triggers_actions" ("table_triggers" uuid NOT NULL, "table_actions" uuid NOT NULL, CONSTRAINT "PK_d5a10491002c0bfd3b3331e6d44" PRIMARY KEY ("table_triggers", "table_actions"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_333cff6a1e46fd3bb2764133de" ON "triggers_actions" ("table_triggers") `);
    await queryRunner.query(`CREATE INDEX "IDX_71e326e6659fa8c2b724e720c8" ON "triggers_actions" ("table_actions") `);
    await queryRunner.query(
      `ALTER TABLE "table_triggers" ADD CONSTRAINT "FK_937487c7a49aefc776beb196f42" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "triggers_actions" ADD CONSTRAINT "FK_333cff6a1e46fd3bb2764133de7" FOREIGN KEY ("table_triggers") REFERENCES "table_triggers"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "triggers_actions" ADD CONSTRAINT "FK_71e326e6659fa8c2b724e720c85" FOREIGN KEY ("table_actions") REFERENCES "table_actions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "triggers_actions" DROP CONSTRAINT "FK_71e326e6659fa8c2b724e720c85"`);
    await queryRunner.query(`ALTER TABLE "triggers_actions" DROP CONSTRAINT "FK_333cff6a1e46fd3bb2764133de7"`);
    await queryRunner.query(`ALTER TABLE "table_triggers" DROP CONSTRAINT "FK_937487c7a49aefc776beb196f42"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_71e326e6659fa8c2b724e720c8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_333cff6a1e46fd3bb2764133de"`);
    await queryRunner.query(`DROP TABLE "triggers_actions"`);
    await queryRunner.query(`DROP TABLE "table_triggers"`);
    await queryRunner.query(`DROP TYPE "public"."table_triggers_trigger_events_enum"`);
  }
}
