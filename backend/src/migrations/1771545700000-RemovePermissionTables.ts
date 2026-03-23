import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePermissionTables1771545700000 implements MigrationInterface {
	name = 'RemovePermissionTables1771545700000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS "permission_groups_group"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "permission"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "permission" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "accessLevel" character varying NOT NULL, "tableName" character varying NOT NULL DEFAULT '', CONSTRAINT "PK_3b8b97af9d9d8807e41e6f48362" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TABLE "permission_groups_group" ("permissionId" uuid NOT NULL, "groupId" uuid NOT NULL, CONSTRAINT "PK_permission_groups_group" PRIMARY KEY ("permissionId", "groupId"))`,
		);
		await queryRunner.query(
			`ALTER TABLE "permission_groups_group" ADD CONSTRAINT "FK_permission_groups_permissionId" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
		);
		await queryRunner.query(
			`ALTER TABLE "permission_groups_group" ADD CONSTRAINT "FK_permission_groups_groupId" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
		);
	}
}
