import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLogoUrlColorsHostNameInConnectionProperties1678180854454 implements MigrationInterface {
    name = 'AddLogoUrlColorsHostNameInConnectionProperties1678180854454'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "logo_url" character varying`);
        await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "primary_color" character varying`);
        await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "secondary_color" character varying`);
        await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "hostname" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "hostname"`);
        await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "secondary_color"`);
        await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "primary_color"`);
        await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "logo_url"`);
    }

}
