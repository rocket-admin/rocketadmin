import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReworkTableActionEntityAddedSlackUrl1718701843492 implements MigrationInterface {
  name = 'ReworkTableActionEntityAddedSlackUrl1718701843492';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "slack_channel"`);
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "slack_bot_token"`);
    await queryRunner.query(`ALTER TABLE "table_actions" ADD "slack_url" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "slack_url"`);
    await queryRunner.query(`ALTER TABLE "table_actions" ADD "slack_bot_token" character varying`);
    await queryRunner.query(`ALTER TABLE "table_actions" ADD "slack_channel" character varying`);
  }
}
