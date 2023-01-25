import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPropertyRequireConfirmationInTableActionEntity1674568279297 implements MigrationInterface {
    name = 'AddPropertyRequireConfirmationInTableActionEntity1674568279297'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "table_actions" ADD "require_confirmation" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "table_actions" DROP COLUMN "require_confirmation"`);
    }

}
