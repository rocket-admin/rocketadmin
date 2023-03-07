import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyNamePropertyConnectionProperties1678195304537 implements MigrationInterface {
    name = 'AddCompanyNamePropertyConnectionProperties1678195304537'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "company_name" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "company_name"`);
    }

}
