import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateTableWidgets1617872481128 implements MigrationInterface {
    name = 'CreateTableWidgets1617872481128'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "table_widget" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "field_name" character varying NOT NULL, "widget_type" character varying NOT NULL, "widget_params" character varying array DEFAULT null, "settingsId" uuid, CONSTRAINT "PK_a75c33a535f559ab8d77aaedc51" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "table_widget" ADD CONSTRAINT "FK_ecc881f8a502dd987b36abdfd51" FOREIGN KEY ("settingsId") REFERENCES "tableSettings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "table_widget" DROP CONSTRAINT "FK_ecc881f8a502dd987b36abdfd51"`);
        await queryRunner.query(`DROP TABLE "table_widget"`);
    }

}
