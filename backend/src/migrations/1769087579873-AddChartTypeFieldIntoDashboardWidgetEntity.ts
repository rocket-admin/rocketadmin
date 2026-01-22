import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChartTypeFieldIntoDashboardWidgetEntity1769087579873 implements MigrationInterface {
	name = 'AddChartTypeFieldIntoDashboardWidgetEntity1769087579873';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dashboard_widget" ADD "chart_type" character varying`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dashboard_widget" DROP COLUMN "chart_type"`);
	}
}
