import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavedDBQueryEntity1767976893755 implements MigrationInterface {
	name = 'AddSavedDBQueryEntity1767976893755';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "saved_db_query" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "query_text" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "connection_id" character varying(38) NOT NULL, CONSTRAINT "PK_a4a1ff55f21c85f9ce11293a2b7" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`ALTER TABLE "saved_db_query" ADD CONSTRAINT "FK_11269686996b3f9dadfc831428a" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "saved_db_query" DROP CONSTRAINT "FK_11269686996b3f9dadfc831428a"`);
		await queryRunner.query(`DROP TABLE "saved_db_query"`);
	}
}
