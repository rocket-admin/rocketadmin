import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateTableSettings1599721879444 implements MigrationInterface {
    name = 'CreateTableSettings1599721879444'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "tableSettings_ordering_enum" AS ENUM('ASC', 'DESC')`);
        await queryRunner.query(`CREATE TABLE "tableSettings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "table_name" character varying DEFAULT null, "display_name" character varying DEFAULT null, "search_fields" character varying array NOT NULL DEFAULT '{}', "excluded_fields" character varying array NOT NULL DEFAULT '{}', "list_fields" character varying array NOT NULL DEFAULT '{}', "list_per_page" integer DEFAULT null, "ordering" "tableSettings_ordering_enum" NOT NULL DEFAULT 'ASC', "ordering_field" character varying DEFAULT null, "readonly_fields" character varying array NOT NULL DEFAULT '{}', "sortable_by" character varying array NOT NULL DEFAULT '{}', "connectionIdId" uuid, CONSTRAINT "UQ_5a62e8aec5c74174d8355c34b70" UNIQUE ("connectionIdId", "table_name"), CONSTRAINT "PK_bf3b951c0d7bd0e4e11a5d9ffba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sid" SET DEFAULT null`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ADD CONSTRAINT "FK_e959bd443a42403e4a76dcdcbef" FOREIGN KEY ("connectionIdId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tableSettings" DROP CONSTRAINT "FK_e959bd443a42403e4a76dcdcbef"`);
        await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sid" SET DEFAULT NULL`);
        await queryRunner.query(`DROP TABLE "tableSettings"`);
        await queryRunner.query(`DROP TYPE "tableSettings_ordering_enum"`);
    }

}
