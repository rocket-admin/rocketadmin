import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReworkTableActionsRemoveRelationBetweenActionsAndConnection1719389599034 implements MigrationInterface {
  name = 'ReworkTableActionsRemoveRelationBetweenActionsAndConnection1719389599034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_rules" DROP CONSTRAINT "FK_754352f9577b1b87a4593eb6f4c"`);
    await queryRunner.query(`ALTER TABLE "action_rules" DROP COLUMN "connectionId"`);
    await queryRunner.query(`ALTER TABLE "action_rules" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "action_rules" ALTER COLUMN "created_at" SET DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_rules" ALTER COLUMN "created_at" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "action_rules" ALTER COLUMN "created_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "action_rules" ADD "connectionId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "action_rules" ADD CONSTRAINT "FK_754352f9577b1b87a4593eb6f4c" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
