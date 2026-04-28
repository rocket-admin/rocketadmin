import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDynamoDbSchemaChangeTypes1777039182865 implements MigrationInterface {
	name = 'AddDynamoDbSchemaChangeTypes1777039182865';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TYPE "public"."table_schema_change_changetype_enum" RENAME TO "table_schema_change_changetype_enum_old"`,
		);
		await queryRunner.query(
			`CREATE TYPE "public"."table_schema_change_changetype_enum" AS ENUM('CREATE_TABLE', 'DROP_TABLE', 'ADD_COLUMN', 'DROP_COLUMN', 'ALTER_COLUMN', 'ADD_INDEX', 'DROP_INDEX', 'ADD_FOREIGN_KEY', 'DROP_FOREIGN_KEY', 'ADD_PRIMARY_KEY', 'DROP_PRIMARY_KEY', 'MONGO_CREATE_COLLECTION', 'MONGO_DROP_COLLECTION', 'MONGO_SET_VALIDATOR', 'MONGO_CREATE_INDEX', 'MONGO_DROP_INDEX', 'DYNAMODB_CREATE_TABLE', 'DYNAMODB_DROP_TABLE', 'DYNAMODB_UPDATE_TABLE', 'DYNAMODB_UPDATE_TTL', 'ROLLBACK', 'OTHER')`,
		);
		await queryRunner.query(
			`ALTER TABLE "table_schema_change" ALTER COLUMN "changeType" TYPE "public"."table_schema_change_changetype_enum" USING "changeType"::"text"::"public"."table_schema_change_changetype_enum"`,
		);
		await queryRunner.query(`DROP TYPE "public"."table_schema_change_changetype_enum_old"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."table_schema_change_changetype_enum_old" AS ENUM('ADD_COLUMN', 'ADD_FOREIGN_KEY', 'ADD_INDEX', 'ADD_PRIMARY_KEY', 'ALTER_COLUMN', 'CREATE_TABLE', 'DROP_COLUMN', 'DROP_FOREIGN_KEY', 'DROP_INDEX', 'DROP_PRIMARY_KEY', 'DROP_TABLE', 'MONGO_CREATE_COLLECTION', 'MONGO_CREATE_INDEX', 'MONGO_DROP_COLLECTION', 'MONGO_DROP_INDEX', 'MONGO_SET_VALIDATOR', 'OTHER', 'ROLLBACK')`,
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
