import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIconFieldInTableActionEntity1668705804535 implements MigrationInterface {
    name = 'AddIconFieldInTableActionEntity1668705804535'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "table_actions" ADD "icon" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "icon"`);
    }

}
