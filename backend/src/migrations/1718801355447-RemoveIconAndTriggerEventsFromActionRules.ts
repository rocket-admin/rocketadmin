import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveIconAndTriggerEventsFromActionRules1718801355447 implements MigrationInterface {
  name = 'RemoveIconAndTriggerEventsFromActionRules1718801355447';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_rules" DROP COLUMN "trigger_events"`);
    await queryRunner.query(`DROP TYPE "public"."action_rules_trigger_events_enum"`);
    await queryRunner.query(`ALTER TABLE "action_rules" DROP COLUMN "icon"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_rules" ADD "icon" character varying`);
    await queryRunner.query(
      `CREATE TYPE "public"."action_rules_trigger_events_enum" AS ENUM('ADD_ROW', 'UPDATE_ROW', 'DELETE_ROW')`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_rules" ADD "trigger_events" "public"."action_rules_trigger_events_enum" array NOT NULL DEFAULT '{ADD_ROW}'`,
    );
  }
}
