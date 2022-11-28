import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSensitiveFieldsInTableSettingsEntity1669625339950 implements MigrationInterface {
    name = 'AddSensitiveFieldsInTableSettingsEntity1669625339950'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tableSettings" ADD "sensitive_fields" character varying array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "sensitive_fields"`);
    }

}
