import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyNameNonUnique1713430478571 implements MigrationInterface {
  name = 'CompanyNameNonUnique1713430478571';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_info" DROP CONSTRAINT "UQ_a46f1a801acc21386a5fce0d420"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company_info" ADD CONSTRAINT "UQ_a46f1a801acc21386a5fce0d420" UNIQUE ("name")`,
    );
  }
}
