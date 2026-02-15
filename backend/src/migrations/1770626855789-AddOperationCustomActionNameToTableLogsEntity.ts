import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOperationCustomActionNameToTableLogsEntity1770626855789 implements MigrationInterface {
	name = 'AddOperationCustomActionNameToTableLogsEntity1770626855789';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "tableLogs" ADD "operation_custom_action_name" character varying`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "tableLogs" DROP COLUMN "operation_custom_action_name"`);
	}
}
