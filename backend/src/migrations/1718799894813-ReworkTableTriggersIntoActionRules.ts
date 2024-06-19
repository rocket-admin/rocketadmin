import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReworkTableTriggersIntoActionRules1718799894813 implements MigrationInterface {
  name = 'ReworkTableTriggersIntoActionRules1718799894813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."action_rules_trigger_events_enum" AS ENUM('ADD_ROW', 'UPDATE_ROW', 'DELETE_ROW')`,
    );
    await queryRunner.query(
      `CREATE TABLE "action_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "table_name" character varying, "icon" character varying, "title" character varying, "created_at" TIMESTAMP, "trigger_events" "public"."action_rules_trigger_events_enum" array NOT NULL DEFAULT '{ADD_ROW}', "connectionId" uuid, CONSTRAINT "PK_01068b2203d4b60abd2d28d0538" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "rules_actions" ("action_rules" uuid NOT NULL, "table_actions" uuid NOT NULL, CONSTRAINT "PK_94e0a9f0ffebdd54de2802bda9c" PRIMARY KEY ("action_rules", "table_actions"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_2c65741fa2bec6a9d82f3f985b" ON "rules_actions" ("action_rules") `);
    await queryRunner.query(`CREATE INDEX "IDX_da79a3ea2105544892c25c5fed" ON "rules_actions" ("table_actions") `);
    await queryRunner.query(
      `ALTER TABLE "action_rules" ADD CONSTRAINT "FK_754352f9577b1b87a4593eb6f4c" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rules_actions" ADD CONSTRAINT "FK_2c65741fa2bec6a9d82f3f985be" FOREIGN KEY ("action_rules") REFERENCES "action_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "rules_actions" ADD CONSTRAINT "FK_da79a3ea2105544892c25c5fed7" FOREIGN KEY ("table_actions") REFERENCES "table_actions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rules_actions" DROP CONSTRAINT "FK_da79a3ea2105544892c25c5fed7"`);
    await queryRunner.query(`ALTER TABLE "rules_actions" DROP CONSTRAINT "FK_2c65741fa2bec6a9d82f3f985be"`);
    await queryRunner.query(`ALTER TABLE "action_rules" DROP CONSTRAINT "FK_754352f9577b1b87a4593eb6f4c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_da79a3ea2105544892c25c5fed"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2c65741fa2bec6a9d82f3f985b"`);
    await queryRunner.query(`DROP TABLE "rules_actions"`);
    await queryRunner.query(`DROP TABLE "action_rules"`);
    await queryRunner.query(`DROP TYPE "public"."action_rules_trigger_events_enum"`);
  }
}
