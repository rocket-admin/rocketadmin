import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiAutoFixColumnsToTableSchemaChange1779975103808 implements MigrationInterface {
	name = 'AddAiAutoFixColumnsToTableSchemaChange1779975103808';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "table_schema_change" ADD "aiAutoFixApplied" boolean NOT NULL DEFAULT false`);
		await queryRunner.query(`ALTER TABLE "table_schema_change" ADD "aiAutoFixOriginalForwardSql" text`);
		await queryRunner.query(`ALTER TABLE "table_schema_change" ADD "aiAutoFixOriginalRollbackSql" text`);
		await queryRunner.query(`ALTER TABLE "table_schema_change" ADD "aiAutoFixOriginalError" text`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "table_schema_change" DROP COLUMN "aiAutoFixOriginalError"`);
		await queryRunner.query(`ALTER TABLE "table_schema_change" DROP COLUMN "aiAutoFixOriginalRollbackSql"`);
		await queryRunner.query(`ALTER TABLE "table_schema_change" DROP COLUMN "aiAutoFixOriginalForwardSql"`);
		await queryRunner.query(`ALTER TABLE "table_schema_change" DROP COLUMN "aiAutoFixApplied"`);
	}
}
