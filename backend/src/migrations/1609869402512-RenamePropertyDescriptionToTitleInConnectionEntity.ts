import {MigrationInterface, QueryRunner} from "typeorm";

export class RenamePropertyDescriptionToTitleInConnectionEntity1609869402512 implements MigrationInterface {
    name = 'RenamePropertyDescriptionToTitleInConnectionEntity1609869402512'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connection" RENAME COLUMN "description" TO "title"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connection" RENAME COLUMN "title" TO "description"`);
    }

}
