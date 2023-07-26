import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyIdsInUserEntity1689694229370 implements MigrationInterface {
  name = 'AddCompanyIdsInUserEntity1689694229370';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "companyIds" uuid array NOT NULL DEFAULT '{}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "companyIds"`);
  }
}
