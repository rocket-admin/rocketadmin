import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreFieldsInCommonTableSettings1768987695763 implements MigrationInterface {
	name = 'RestoreFieldsInCommonTableSettings1768987695763';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "tableSettings" ADD "list_fields" character varying array NOT NULL DEFAULT '{}'`,
		);
		await queryRunner.query(`ALTER TABLE "tableSettings" ADD "list_per_page" integer`);
		await queryRunner.query(`CREATE TYPE "public"."tableSettings_ordering_enum" AS ENUM('ASC', 'DESC')`);
		await queryRunner.query(`ALTER TABLE "tableSettings" ADD "ordering" "public"."tableSettings_ordering_enum"`);
		await queryRunner.query(`ALTER TABLE "tableSettings" ADD "ordering_field" character varying`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "ordering_field"`);
		await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "ordering"`);
		await queryRunner.query(`DROP TYPE "public"."tableSettings_ordering_enum"`);
		await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "list_per_page"`);
		await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "list_fields"`);
	}
}
