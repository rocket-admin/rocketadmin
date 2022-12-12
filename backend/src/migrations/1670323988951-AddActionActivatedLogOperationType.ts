import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActionActivatedLogOperationType1670323988951 implements MigrationInterface {
  name = 'AddActionActivatedLogOperationType1670323988951';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."tableLogs_operationtype_enum" RENAME TO "tableLogs_operationtype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tableLogs_operationtype_enum" AS ENUM('addRow', 'updateRow', 'deleteRow', 'unknown', 'rowReceived', 'rowsReceived', 'actionActivated')`,
    );
    await queryRunner.query(`ALTER TABLE "tableLogs" ALTER COLUMN "operationType" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "tableLogs" ALTER COLUMN "operationType" TYPE "public"."tableLogs_operationtype_enum" USING "operationType"::"text"::"public"."tableLogs_operationtype_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "tableLogs" ALTER COLUMN "operationType" SET DEFAULT 'unknown'`);
    await queryRunner.query(`DROP TYPE "public"."tableLogs_operationtype_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tableLogs_operationtype_enum_old" AS ENUM('addRow', 'updateRow', 'deleteRow', 'unknown', 'rowReceived', 'rowsReceived')`,
    );
    await queryRunner.query(`ALTER TABLE "tableLogs" ALTER COLUMN "operationType" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "tableLogs" ALTER COLUMN "operationType" TYPE "public"."tableLogs_operationtype_enum_old" USING "operationType"::"text"::"public"."tableLogs_operationtype_enum_old"`,
    );
    await queryRunner.query(`ALTER TABLE "tableLogs" ALTER COLUMN "operationType" SET DEFAULT 'unknown'`);
    await queryRunner.query(`DROP TYPE "public"."tableLogs_operationtype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."tableLogs_operationtype_enum_old" RENAME TO "tableLogs_operationtype_enum"`,
    );
  }
}
