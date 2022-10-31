import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCanDeleteUpdateAddOptionsInTableSettingsEntity1666959132601 implements MigrationInterface {
    name = 'AddCanDeleteUpdateAddOptionsInTableSettingsEntity1666959132601'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tableSettings" ADD "can_delete" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ADD "can_update" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ADD "can_add" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "can_add"`);
        await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "can_update"`);
        await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "can_delete"`);
    }

}
