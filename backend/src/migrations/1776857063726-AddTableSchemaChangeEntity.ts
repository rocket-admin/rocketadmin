import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTableSchemaChangeEntity1776857063726 implements MigrationInterface {
	name = 'AddTableSchemaChangeEntity1776857063726';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "panel" DROP CONSTRAINT "FK_panel_connection_id"`);
		await queryRunner.query(`ALTER TABLE "panel_position" DROP CONSTRAINT "FK_panel_position_dashboard_id"`);
		await queryRunner.query(`ALTER TABLE "panel_position" DROP CONSTRAINT "FK_panel_position_query_id"`);
		await queryRunner.query(
			`CREATE TYPE "public"."table_schema_change_status_enum" AS ENUM('PENDING', 'APPROVED', 'APPLYING', 'APPLIED', 'FAILED', 'REJECTED', 'ROLLED_BACK')`,
		);
		await queryRunner.query(
			`CREATE TYPE "public"."table_schema_change_changetype_enum" AS ENUM('CREATE_TABLE', 'DROP_TABLE', 'ADD_COLUMN', 'DROP_COLUMN', 'ALTER_COLUMN', 'ADD_INDEX', 'DROP_INDEX', 'ADD_FOREIGN_KEY', 'DROP_FOREIGN_KEY', 'ADD_PRIMARY_KEY', 'DROP_PRIMARY_KEY', 'ROLLBACK', 'OTHER')`,
		);
		await queryRunner.query(
			`CREATE TYPE "public"."table_schema_change_databasetype_enum" AS ENUM('postgres', 'mysql', 'mysql2', 'oracledb', 'mssql', 'ibmdb2', 'mongodb', 'dynamodb', 'elasticsearch', 'cassandra', 'redis', 'clickhouse', 'agent_postgres', 'agent_mysql', 'agent_oracledb', 'agent_mssql', 'agent_ibmdb2', 'agent_mongodb', 'agent_cassandra', 'agent_redis', 'agent_clickhouse')`,
		);
		await queryRunner.query(
			`CREATE TABLE "table_schema_change" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "connectionId" character varying(38) NOT NULL, "authorId" uuid, "previousChangeId" uuid, "forwardSql" text NOT NULL, "rollbackSql" text, "userModifiedSql" text, "status" "public"."table_schema_change_status_enum" NOT NULL DEFAULT 'PENDING', "changeType" "public"."table_schema_change_changetype_enum" NOT NULL, "targetTableName" character varying(255) NOT NULL, "databaseType" "public"."table_schema_change_databasetype_enum" NOT NULL, "executionError" text, "isReversible" boolean NOT NULL DEFAULT false, "autoRollbackAttempted" boolean NOT NULL DEFAULT false, "autoRollbackSucceeded" boolean NOT NULL DEFAULT false, "userPrompt" text NOT NULL, "aiSummary" text, "aiReasoning" text, "aiModelUsed" character varying(128), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "appliedAt" TIMESTAMP, "rolledBackAt" TIMESTAMP, CONSTRAINT "PK_ee65b71505c45d00372ff208cd2" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(`CREATE INDEX "IDX_tsc_previous_change" ON "table_schema_change" ("previousChangeId") `);
		await queryRunner.query(
			`CREATE INDEX "IDX_tsc_connection_created" ON "table_schema_change" ("connectionId", "createdAt") `,
		);
		await queryRunner.query(
			`ALTER TYPE "public"."table_filters_dynamic_filter_comparator_enum" RENAME TO "table_filters_dynamic_filter_comparator_enum_old"`,
		);
		await queryRunner.query(
			`CREATE TYPE "public"."table_filters_dynamic_filter_comparator_enum" AS ENUM('startswith', 'endswith', 'gt', 'lt', 'lte', 'gte', 'contains', 'icontains', 'eq', 'empty', 'in', 'between')`,
		);
		await queryRunner.query(
			`ALTER TABLE "table_filters" ALTER COLUMN "dynamic_filter_comparator" TYPE "public"."table_filters_dynamic_filter_comparator_enum" USING "dynamic_filter_comparator"::"text"::"public"."table_filters_dynamic_filter_comparator_enum"`,
		);
		await queryRunner.query(`DROP TYPE "public"."table_filters_dynamic_filter_comparator_enum_old"`);
		await queryRunner.query(
			`ALTER TABLE "panel" ADD CONSTRAINT "FK_3599e7a2eea197b002732551452" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "panel_position" ADD CONSTRAINT "FK_9c17df1164acacbd35ba53ceb0e" FOREIGN KEY ("dashboard_id") REFERENCES "dashboard"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "panel_position" ADD CONSTRAINT "FK_13678f419020d212019508d4d68" FOREIGN KEY ("query_id") REFERENCES "panel"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "table_schema_change" ADD CONSTRAINT "FK_ab6fb01554213543f0a39f7d98e" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "table_schema_change" ADD CONSTRAINT "FK_d4a735643602c7e2337770d368b" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "table_schema_change" ADD CONSTRAINT "FK_f15e652a55b856bf9c64c012d00" FOREIGN KEY ("previousChangeId") REFERENCES "table_schema_change"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "table_schema_change" DROP CONSTRAINT "FK_f15e652a55b856bf9c64c012d00"`);
		await queryRunner.query(`ALTER TABLE "table_schema_change" DROP CONSTRAINT "FK_d4a735643602c7e2337770d368b"`);
		await queryRunner.query(`ALTER TABLE "table_schema_change" DROP CONSTRAINT "FK_ab6fb01554213543f0a39f7d98e"`);
		await queryRunner.query(`ALTER TABLE "panel_position" DROP CONSTRAINT "FK_13678f419020d212019508d4d68"`);
		await queryRunner.query(`ALTER TABLE "panel_position" DROP CONSTRAINT "FK_9c17df1164acacbd35ba53ceb0e"`);
		await queryRunner.query(`ALTER TABLE "panel" DROP CONSTRAINT "FK_3599e7a2eea197b002732551452"`);
		await queryRunner.query(
			`CREATE TYPE "public"."table_filters_dynamic_filter_comparator_enum_old" AS ENUM('startswith', 'endswith', 'gt', 'lt', 'lte', 'gte', 'contains', 'icontains', 'eq', 'empty')`,
		);
		await queryRunner.query(
			`ALTER TABLE "table_filters" ALTER COLUMN "dynamic_filter_comparator" TYPE "public"."table_filters_dynamic_filter_comparator_enum_old" USING "dynamic_filter_comparator"::"text"::"public"."table_filters_dynamic_filter_comparator_enum_old"`,
		);
		await queryRunner.query(`DROP TYPE "public"."table_filters_dynamic_filter_comparator_enum"`);
		await queryRunner.query(
			`ALTER TYPE "public"."table_filters_dynamic_filter_comparator_enum_old" RENAME TO "table_filters_dynamic_filter_comparator_enum"`,
		);
		await queryRunner.query(`DROP INDEX "public"."IDX_tsc_connection_created"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_tsc_previous_change"`);
		await queryRunner.query(`DROP TABLE "table_schema_change"`);
		await queryRunner.query(`DROP TYPE "public"."table_schema_change_databasetype_enum"`);
		await queryRunner.query(`DROP TYPE "public"."table_schema_change_changetype_enum"`);
		await queryRunner.query(`DROP TYPE "public"."table_schema_change_status_enum"`);
		await queryRunner.query(
			`ALTER TABLE "panel_position" ADD CONSTRAINT "FK_panel_position_query_id" FOREIGN KEY ("query_id") REFERENCES "panel"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "panel_position" ADD CONSTRAINT "FK_panel_position_dashboard_id" FOREIGN KEY ("dashboard_id") REFERENCES "dashboard"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "panel" ADD CONSTRAINT "FK_panel_connection_id" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}
}
