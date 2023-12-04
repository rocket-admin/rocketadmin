import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveTableAuditPropertyFromConnectionEntity1701690979706 implements MigrationInterface {
    name = 'RemoveTableAuditPropertyFromConnectionEntity1701690979706'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "tables_audit"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connection" ADD "tables_audit" boolean NOT NULL DEFAULT true`);
    }

}
