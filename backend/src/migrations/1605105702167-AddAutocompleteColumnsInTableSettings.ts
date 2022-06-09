import {MigrationInterface, QueryRunner} from "typeorm";

export class AddAutocompleteColumnsInTableSettings1605105702167 implements MigrationInterface {
    name = 'AddAutocompleteColumnsInTableSettings1605105702167'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tableSettings" ADD "autocomplete_columns" character varying array NOT NULL DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "autocomplete_columns"`);
    }

}
