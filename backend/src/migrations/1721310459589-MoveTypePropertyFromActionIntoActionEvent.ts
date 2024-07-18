import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveTypePropertyFromActionIntoActionEvent1721310459589 implements MigrationInterface {
  name = 'MoveTypePropertyFromActionIntoActionEvent1721310459589';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."table_actions_type_enum"`);
    await queryRunner.query(`CREATE TYPE "public"."action_events_type_enum" AS ENUM('single', 'multiple')`);
    await queryRunner.query(
      `ALTER TABLE "action_events" ADD "type" "public"."action_events_type_enum" NOT NULL DEFAULT 'single'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_events" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."action_events_type_enum"`);
    await queryRunner.query(`CREATE TYPE "public"."table_actions_type_enum" AS ENUM('single', 'multiple')`);
    await queryRunner.query(
      `ALTER TABLE "table_actions" ADD "type" "public"."table_actions_type_enum" NOT NULL DEFAULT 'single'`,
    );
  }
}
