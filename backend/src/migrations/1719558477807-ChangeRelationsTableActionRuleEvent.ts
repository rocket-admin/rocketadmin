import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeRelationsTableActionRuleEvent1719558477807 implements MigrationInterface {
  name = 'ChangeRelationsTableActionRuleEvent1719558477807';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_events" ADD "action_rule_id" uuid`);
    await queryRunner.query(`ALTER TABLE "table_actions" ADD "action_rule_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "action_events" ADD CONSTRAINT "FK_a50c2b0972fa5a305a57d9babc0" FOREIGN KEY ("action_rule_id") REFERENCES "action_rules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_actions" ADD CONSTRAINT "FK_da9e88e07a6949839e8a161ba7d" FOREIGN KEY ("action_rule_id") REFERENCES "action_rules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_actions" DROP CONSTRAINT "FK_da9e88e07a6949839e8a161ba7d"`);
    await queryRunner.query(`ALTER TABLE "action_events" DROP CONSTRAINT "FK_a50c2b0972fa5a305a57d9babc0"`);
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "action_rule_id"`);
    await queryRunner.query(`ALTER TABLE "action_events" DROP COLUMN "action_rule_id"`);
  }
}
