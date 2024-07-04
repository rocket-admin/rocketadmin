import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActionEventEntityAndRelations1718965562799 implements MigrationInterface {
  name = 'AddActionEventEntityAndRelations1718965562799';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."action_events_event_enum" AS ENUM('ADD_ROW', 'UPDATE_ROW', 'DELETE_ROW', 'CUSTOM')`,
    );
    await queryRunner.query(
      `CREATE TABLE "action_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event" "public"."action_events_event_enum" NOT NULL DEFAULT 'CUSTOM', "title" character varying, "icon" character varying, "table_name" character varying, "created_at" TIMESTAMP, "require_confirmation" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_38b3cd177b610ee89f23bec7ea8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "rules_events" ("action_rules" uuid NOT NULL, "action_events" uuid NOT NULL, CONSTRAINT "PK_3a51ebca253c2305650ab97a699" PRIMARY KEY ("action_rules", "action_events"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_5219b43c93dfa03f98eec58e98" ON "rules_events" ("action_rules") `);
    await queryRunner.query(`CREATE INDEX "IDX_3f0cd18797ae23deb078612b6d" ON "rules_events" ("action_events") `);
    await queryRunner.query(`ALTER TABLE "table_actions" ADD "created_at" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "rules_events" ADD CONSTRAINT "FK_5219b43c93dfa03f98eec58e98f" FOREIGN KEY ("action_rules") REFERENCES "action_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "rules_events" ADD CONSTRAINT "FK_3f0cd18797ae23deb078612b6dd" FOREIGN KEY ("action_events") REFERENCES "action_events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rules_events" DROP CONSTRAINT "FK_3f0cd18797ae23deb078612b6dd"`);
    await queryRunner.query(`ALTER TABLE "rules_events" DROP CONSTRAINT "FK_5219b43c93dfa03f98eec58e98f"`);
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3f0cd18797ae23deb078612b6d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5219b43c93dfa03f98eec58e98"`);
    await queryRunner.query(`DROP TABLE "rules_events"`);
    await queryRunner.query(`DROP TABLE "action_events"`);
    await queryRunner.query(`DROP TYPE "public"."action_events_event_enum"`);
  }
}
