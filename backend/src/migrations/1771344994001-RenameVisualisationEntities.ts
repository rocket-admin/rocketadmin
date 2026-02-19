import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameVisualisationEntities1771344994001 implements MigrationInterface {
	name = 'RenameVisualisationEntities1771344994001';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "dashboard_widget" DROP CONSTRAINT IF EXISTS "FK_2d30b309abbaf0e051fd89560b9"`,
		);
		await queryRunner.query(
			`ALTER TABLE "dashboard_widget" DROP CONSTRAINT IF EXISTS "FK_1d4cbbe2829d760116ce4472bd5"`,
		);
		await queryRunner.query(`ALTER TABLE "saved_db_query" DROP CONSTRAINT IF EXISTS "FK_11269686996b3f9dadfc831428a"`);
		await queryRunner.query(`ALTER TABLE "saved_db_query" RENAME TO "panel"`);

		await queryRunner.query(`ALTER TABLE "panel" RENAME COLUMN "widget_type" TO "panel_type"`);
		await queryRunner.query(`ALTER TABLE "panel" RENAME COLUMN "widget_options" TO "panel_options"`);
		await queryRunner.query(`ALTER TABLE "dashboard_widget" RENAME TO "panel_position"`);
		await queryRunner.query(
			`ALTER TABLE "panel" ADD CONSTRAINT "FK_panel_connection_id" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "panel_position" ADD CONSTRAINT "FK_panel_position_dashboard_id" FOREIGN KEY ("dashboard_id") REFERENCES "dashboard"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "panel_position" ADD CONSTRAINT "FK_panel_position_query_id" FOREIGN KEY ("query_id") REFERENCES "panel"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "panel_position" DROP CONSTRAINT IF EXISTS "FK_panel_position_query_id"`);
		await queryRunner.query(`ALTER TABLE "panel_position" DROP CONSTRAINT IF EXISTS "FK_panel_position_dashboard_id"`);
		await queryRunner.query(`ALTER TABLE "panel" DROP CONSTRAINT IF EXISTS "FK_panel_connection_id"`);
		await queryRunner.query(`ALTER TABLE "panel_position" RENAME TO "dashboard_widget"`);
		await queryRunner.query(`ALTER TABLE "panel" RENAME COLUMN "panel_type" TO "widget_type"`);
		await queryRunner.query(`ALTER TABLE "panel" RENAME COLUMN "panel_options" TO "widget_options"`);
		await queryRunner.query(`ALTER TABLE "panel" RENAME TO "saved_db_query"`);
		await queryRunner.query(
			`ALTER TABLE "saved_db_query" ADD CONSTRAINT "FK_11269686996b3f9dadfc831428a" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "dashboard_widget" ADD CONSTRAINT "FK_1d4cbbe2829d760116ce4472bd5" FOREIGN KEY ("dashboard_id") REFERENCES "dashboard"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "dashboard_widget" ADD CONSTRAINT "FK_2d30b309abbaf0e051fd89560b9" FOREIGN KEY ("query_id") REFERENCES "saved_db_query"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
		);
	}
}
