import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimeStampColumnsIntoSettingsAndWidgetsEntities1769610545842 implements MigrationInterface {
	name = 'AddTimeStampColumnsIntoSettingsAndWidgetsEntities1769610545842';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "personal_table_settings" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "personal_table_settings" ADD "updated_at" TIMESTAMP DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "tableSettings" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "tableSettings" ADD "updated_at" TIMESTAMP DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "table_widget" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "table_widget" ADD "updated_at" TIMESTAMP DEFAULT now()`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "table_widget" DROP COLUMN "updated_at"`);
		await queryRunner.query(`ALTER TABLE "table_widget" DROP COLUMN "created_at"`);
		await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "updated_at"`);
		await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "created_at"`);
		await queryRunner.query(`ALTER TABLE "personal_table_settings" DROP COLUMN "updated_at"`);
		await queryRunner.query(`ALTER TABLE "personal_table_settings" DROP COLUMN "created_at"`);
	}
}
