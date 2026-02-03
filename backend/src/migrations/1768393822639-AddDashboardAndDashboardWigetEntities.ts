import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDashboardAndDashboardWigetEntities1768393822639 implements MigrationInterface {
	name = 'AddDashboardAndDashboardWigetEntities1768393822639';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "dashboard" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "connection_id" character varying NOT NULL, CONSTRAINT "PK_233ed28fa3a1f9fbe743f571f75" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TABLE "dashboard_widget" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "widget_type" character varying NOT NULL, "name" character varying, "description" text, "position_x" integer NOT NULL DEFAULT '0', "position_y" integer NOT NULL DEFAULT '0', "width" integer NOT NULL DEFAULT '4', "height" integer NOT NULL DEFAULT '3', "widget_options" json, "dashboard_id" uuid NOT NULL, "query_id" uuid, CONSTRAINT "PK_d776e45a42322c53e9167b00ead" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`ALTER TABLE "dashboard" ADD CONSTRAINT "FK_61891f58faf0242381786d60334" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "dashboard_widget" ADD CONSTRAINT "FK_1d4cbbe2829d760116ce4472bd5" FOREIGN KEY ("dashboard_id") REFERENCES "dashboard"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "dashboard_widget" ADD CONSTRAINT "FK_2d30b309abbaf0e051fd89560b9" FOREIGN KEY ("query_id") REFERENCES "saved_db_query"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "dashboard_widget" DROP CONSTRAINT "FK_2d30b309abbaf0e051fd89560b9"`);
		await queryRunner.query(`ALTER TABLE "dashboard_widget" DROP CONSTRAINT "FK_1d4cbbe2829d760116ce4472bd5"`);
		await queryRunner.query(`ALTER TABLE "dashboard" DROP CONSTRAINT "FK_61891f58faf0242381786d60334"`);
		await queryRunner.query(`DROP TABLE "dashboard_widget"`);
		await queryRunner.query(`DROP TABLE "dashboard"`);
	}
}
