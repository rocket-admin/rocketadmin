import {MigrationInterface, QueryRunner} from "typeorm";

export class AddTableLogs1608192478936 implements MigrationInterface {
    name = 'AddTableLogs1608192478936'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "tableLogs_operationtype_enum" AS ENUM('addRow', 'updateRow', 'deleteRow', 'unknown')`);
        await queryRunner.query(`CREATE TYPE "tableLogs_operationstatusresult_enum" AS ENUM('successfully', 'unsuccessfully', 'unknown')`);
        await queryRunner.query(`CREATE TABLE "tableLogs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "table_name" character varying DEFAULT null, "received_data" character varying DEFAULT null, "cognitoUserName" character varying DEFAULT null, "email" character varying DEFAULT null, "operationType" "tableLogs_operationtype_enum" NOT NULL DEFAULT 'unknown', "operationStatusResult" "tableLogs_operationstatusresult_enum" NOT NULL DEFAULT 'unknown', "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "connectionIdId" uuid, CONSTRAINT "PK_6ca1c0508e16757b5ce6f64cacf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "tableLogs" ADD CONSTRAINT "FK_a5dd6c8c66dd42f16aa72b3afd3" FOREIGN KEY ("connectionIdId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tableLogs" DROP CONSTRAINT "FK_a5dd6c8c66dd42f16aa72b3afd3"`);
        await queryRunner.query(`DROP TABLE "tableLogs"`);
        await queryRunner.query(`DROP TYPE "tableLogs_operationstatusresult_enum"`);
        await queryRunner.query(`DROP TYPE "tableLogs_operationtype_enum"`);
    }

}
