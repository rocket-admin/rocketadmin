import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBatchColumnsToTableSchemaChange1777295364595 implements MigrationInterface {
	name = 'AddBatchColumnsToTableSchemaChange1777295364595';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "table_schema_change" ADD "batchId" uuid`);
		await queryRunner.query(`ALTER TABLE "table_schema_change" ADD "orderInBatch" integer NOT NULL DEFAULT '0'`);
		await queryRunner.query(`CREATE INDEX "IDX_tsc_batch_order" ON "table_schema_change" ("batchId", "orderInBatch") `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "public"."IDX_tsc_batch_order"`);
		await queryRunner.query(`ALTER TABLE "table_schema_change" DROP COLUMN "orderInBatch"`);
		await queryRunner.query(`ALTER TABLE "table_schema_change" DROP COLUMN "batchId"`);
	}
}
