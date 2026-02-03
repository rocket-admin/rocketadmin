import { MigrationInterface, QueryRunner } from 'typeorm';

export class MovedDashboardWidgetPropertiesToSavedQuery1770116525022 implements MigrationInterface {
	name = 'MovedDashboardWidgetPropertiesToSavedQuery1770116525022';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dashboard_widget" DROP COLUMN "widget_options"`);
		await queryRunner.query(`ALTER TABLE "dashboard_widget" DROP COLUMN "widget_type"`);
		await queryRunner.query(`ALTER TABLE "dashboard_widget" DROP COLUMN "name"`);
		await queryRunner.query(`ALTER TABLE "dashboard_widget" DROP COLUMN "description"`);
		await queryRunner.query(`ALTER TABLE "dashboard_widget" DROP COLUMN "chart_type"`);
		await queryRunner.query(`ALTER TABLE "saved_db_query" ADD "widget_type" character varying NOT NULL`);
		await queryRunner.query(`ALTER TABLE "saved_db_query" ADD "chart_type" character varying`);
		await queryRunner.query(`ALTER TABLE "saved_db_query" ADD "widget_options" json`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "saved_db_query" DROP COLUMN "widget_options"`);
		await queryRunner.query(`ALTER TABLE "saved_db_query" DROP COLUMN "chart_type"`);
		await queryRunner.query(`ALTER TABLE "saved_db_query" DROP COLUMN "widget_type"`);
		await queryRunner.query(`ALTER TABLE "dashboard_widget" ADD "chart_type" character varying`);
		await queryRunner.query(`ALTER TABLE "dashboard_widget" ADD "description" text`);
		await queryRunner.query(`ALTER TABLE "dashboard_widget" ADD "name" character varying`);
		await queryRunner.query(`ALTER TABLE "dashboard_widget" ADD "widget_type" character varying NOT NULL`);
		await queryRunner.query(`ALTER TABLE "dashboard_widget" ADD "widget_options" json`);
	}
}
