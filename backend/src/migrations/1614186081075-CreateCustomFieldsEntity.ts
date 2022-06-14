import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateCustomFieldsEntity1614186081075 implements MigrationInterface {
    name = 'CreateCustomFieldsEntity1614186081075'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "customFields" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "template_string" character varying NOT NULL, "text" character varying NOT NULL, "settingsId" uuid, CONSTRAINT "PK_94cb2a5e19fec9795de86dde31f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "customFields" ADD CONSTRAINT "FK_240d8dd07936ff4758e650a52f3" FOREIGN KEY ("settingsId") REFERENCES "tableSettings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customFields" DROP CONSTRAINT "FK_240d8dd07936ff4758e650a52f3"`);
        await queryRunner.query(`DROP TABLE "customFields"`);
    }

}
