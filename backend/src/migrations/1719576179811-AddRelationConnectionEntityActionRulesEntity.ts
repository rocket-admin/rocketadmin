import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRelationConnectionEntityActionRuleEntity1719576179811 implements MigrationInterface {
  name = 'AddRelationConnectionEntityActionRuleEntity1719576179811';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_rules" ADD "connection_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "action_rules" ADD CONSTRAINT "FK_b4d9e8aa8bb729005941f4cdbac" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_rules" DROP CONSTRAINT "FK_b4d9e8aa8bb729005941f4cdbac"`);
    await queryRunner.query(`ALTER TABLE "action_rules" DROP COLUMN "connection_id"`);
  }
}
