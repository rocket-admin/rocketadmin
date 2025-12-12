import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeDefultColorValuesInConnectionProperties1762258082256 implements MigrationInterface {
  name = 'ChangeDefultColorValuesInConnectionProperties1762258082256';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connectionProperties" ALTER COLUMN "primary_color" SET DEFAULT ''`);
    await queryRunner.query(`UPDATE "connectionProperties" SET "primary_color" = '' WHERE "primary_color" IS NULL`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" ALTER COLUMN "primary_color" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" ALTER COLUMN "secondary_color" SET DEFAULT ''`);
    await queryRunner.query(`UPDATE "connectionProperties" SET "secondary_color" = '' WHERE "secondary_color" IS NULL`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" ALTER COLUMN "secondary_color" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connectionProperties" ALTER COLUMN "secondary_color" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" ALTER COLUMN "secondary_color" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" ALTER COLUMN "primary_color" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" ALTER COLUMN "primary_color" DROP NOT NULL`);
  }
}
