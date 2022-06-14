import {MigrationInterface, QueryRunner} from "typeorm";

export class AddNewTableLogsEnumValues1624019569920 implements MigrationInterface {
    name = 'AddNewTableLogsEnumValues1624019569920'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."tableLogs_operationtype_enum" RENAME TO "tableLogs_operationtype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "tableLogs_operationtype_enum" AS ENUM('addRow', 'updateRow', 'deleteRow', 'unknown', 'rowReceived', 'rowsReceived')`);
        await queryRunner.query(`ALTER TABLE "tableLogs" ALTER COLUMN "operationType" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tableLogs" ALTER COLUMN "operationType" TYPE "tableLogs_operationtype_enum" USING "operationType"::"text"::"tableLogs_operationtype_enum"`);
        await queryRunner.query(`ALTER TABLE "tableLogs" ALTER COLUMN "operationType" SET DEFAULT 'unknown'`);
        await queryRunner.query(`DROP TYPE "tableLogs_operationtype_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "tableLogs_operationtype_enum_old" AS ENUM('addRow', 'updateRow', 'deleteRow', 'unknown')`);
        await queryRunner.query(`ALTER TABLE "tableLogs" ALTER COLUMN "operationType" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tableLogs" ALTER COLUMN "operationType" TYPE "tableLogs_operationtype_enum_old" USING "operationType"::"text"::"tableLogs_operationtype_enum_old"`);
        await queryRunner.query(`ALTER TABLE "tableLogs" ALTER COLUMN "operationType" SET DEFAULT 'unknown'`);
        await queryRunner.query(`DROP TYPE "tableLogs_operationtype_enum"`);
        await queryRunner.query(`ALTER TYPE "tableLogs_operationtype_enum_old" RENAME TO  "tableLogs_operationtype_enum"`);
    }

}
