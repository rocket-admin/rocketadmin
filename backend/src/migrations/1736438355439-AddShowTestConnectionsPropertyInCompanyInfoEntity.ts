import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShowTestConnectionsPropertyInCompanyInfoEntity1736438355439 implements MigrationInterface {
  name = 'AddShowTestConnectionsPropertyInCompanyInfoEntity1736438355439';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_info" ADD "show_test_connections" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_info" DROP COLUMN "show_test_connections"`);
  }
}
