import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultTimestampInTableActionEntity1719404444515 implements MigrationInterface {
  name = 'AddDefaultTimestampInTableActionEntity1719404444515';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "table_actions" SET "created_at" = now() WHERE "created_at" IS NULL`);
    await queryRunner.query(`ALTER TABLE "table_actions" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "table_actions" ALTER COLUMN "created_at" SET DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_actions" ALTER COLUMN "created_at" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "table_actions" ALTER COLUMN "created_at" DROP NOT NULL`);
  }
}
