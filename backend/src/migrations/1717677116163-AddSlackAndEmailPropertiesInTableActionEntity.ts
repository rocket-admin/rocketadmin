import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlackAndEmailPropertiesInTableActionEntity1717677116163 implements MigrationInterface {
  name = 'AddSlackAndEmailPropertiesInTableActionEntity1717677116163';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."table_actions_method_enum" AS ENUM('HTTP', 'ZAPIER', 'WEBHOOK', 'EMAIL', 'SLACK')`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_actions" ADD "method" "public"."table_actions_method_enum" NOT NULL DEFAULT 'HTTP'`,
    );
    await queryRunner.query(`ALTER TABLE "table_actions" ADD "slack_channel" character varying`);
    await queryRunner.query(`ALTER TABLE "table_actions" ADD "slack_bot_token" character varying`);
    await queryRunner.query(`ALTER TABLE "table_actions" ADD "emails" character varying array NOT NULL DEFAULT '{}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "emails"`);
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "slack_bot_token"`);
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "slack_channel"`);
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "method"`);
    await queryRunner.query(`DROP TYPE "public"."table_actions_method_enum"`);
  }
}
