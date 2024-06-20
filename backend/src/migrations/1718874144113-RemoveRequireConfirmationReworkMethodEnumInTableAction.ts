import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRequireConfirmationReworkMethodEnumInTableAction1718874144113 implements MigrationInterface {
  name = 'RemoveRequireConfirmationReworkMethodEnumInTableAction1718874144113';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "require_confirmation"`);
    await queryRunner.query(
      `ALTER TYPE "public"."table_actions_method_enum" RENAME TO "table_actions_method_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."table_actions_method_enum" AS ENUM('ZAPIER', 'EMAIL', 'SLACK', 'URL')`,
    );
    await queryRunner.query(`ALTER TABLE "table_actions" ALTER COLUMN "method" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "table_actions" ALTER COLUMN "method" TYPE "public"."table_actions_method_enum" USING "method"::"text"::"public"."table_actions_method_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "table_actions" ALTER COLUMN "method" SET DEFAULT 'URL'`);
    await queryRunner.query(`DROP TYPE "public"."table_actions_method_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."table_actions_method_enum_old" AS ENUM('HTTP', 'ZAPIER', 'WEBHOOK', 'EMAIL', 'SLACK')`,
    );
    await queryRunner.query(`ALTER TABLE "table_actions" ALTER COLUMN "method" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "table_actions" ALTER COLUMN "method" TYPE "public"."table_actions_method_enum_old" USING "method"::"text"::"public"."table_actions_method_enum_old"`,
    );
    await queryRunner.query(`ALTER TABLE "table_actions" ALTER COLUMN "method" SET DEFAULT 'HTTP'`);
    await queryRunner.query(`DROP TYPE "public"."table_actions_method_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."table_actions_method_enum_old" RENAME TO "table_actions_method_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "table_actions" ADD "require_confirmation" boolean NOT NULL DEFAULT false`);
  }
}
