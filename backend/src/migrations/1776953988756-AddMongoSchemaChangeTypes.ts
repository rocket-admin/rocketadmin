import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMongoSchemaChangeTypes1776953988756 implements MigrationInterface {
	name = 'AddMongoSchemaChangeTypes1776953988756';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TYPE "public"."table_schema_change_changetype_enum" RENAME TO "table_schema_change_changetype_enum_old"`,
		);
		await queryRunner.query(
			`CREATE TYPE "public"."table_schema_change_changetype_enum" AS ENUM('CREATE_TABLE', 'DROP_TABLE', 'ADD_COLUMN', 'DROP_COLUMN', 'ALTER_COLUMN', 'ADD_INDEX', 'DROP_INDEX', 'ADD_FOREIGN_KEY', 'DROP_FOREIGN_KEY', 'ADD_PRIMARY_KEY', 'DROP_PRIMARY_KEY', 'MONGO_CREATE_COLLECTION', 'MONGO_DROP_COLLECTION', 'MONGO_SET_VALIDATOR', 'MONGO_CREATE_INDEX', 'MONGO_DROP_INDEX', 'ROLLBACK', 'OTHER')`,
		);
		await queryRunner.query(
			`ALTER TABLE "table_schema_change" ALTER COLUMN "changeType" TYPE "public"."table_schema_change_changetype_enum" USING "changeType"::"text"::"public"."table_schema_change_changetype_enum"`,
		);
		await queryRunner.query(`DROP TYPE "public"."table_schema_change_changetype_enum_old"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."table_schema_change_changetype_enum_old" AS ENUM('CREATE_TABLE', 'DROP_TABLE', 'ADD_COLUMN', 'DROP_COLUMN', 'ALTER_COLUMN', 'ADD_INDEX', 'DROP_INDEX', 'ADD_FOREIGN_KEY', 'DROP_FOREIGN_KEY', 'ADD_PRIMARY_KEY', 'DROP_PRIMARY_KEY', 'ROLLBACK', 'OTHER')`,
		);
		await queryRunner.query(
			`ALTER TABLE "table_schema_change" ALTER COLUMN "changeType" TYPE "public"."table_schema_change_changetype_enum_old" USING "changeType"::"text"::"public"."table_schema_change_changetype_enum_old"`,
		);
		await queryRunner.query(`DROP TYPE "public"."table_schema_change_changetype_enum"`);
		await queryRunner.query(
			`ALTER TYPE "public"."table_schema_change_changetype_enum_old" RENAME TO "table_schema_change_changetype_enum"`,
		);
	}
}
