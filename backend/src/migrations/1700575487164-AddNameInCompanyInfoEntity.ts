import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameInCompanyInfoEntity1700575487164 implements MigrationInterface {
  name = 'AddNameInCompanyInfoEntity1700575487164';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_info" ADD "name" character varying(255)`);
    await queryRunner.query(
      `ALTER TABLE "company_info" ADD CONSTRAINT "UQ_a46f1a801acc21386a5fce0d420" UNIQUE ("name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_info" DROP CONSTRAINT "UQ_a46f1a801acc21386a5fce0d420"`);
    await queryRunner.query(`ALTER TABLE "company_info" DROP COLUMN "name"`);
  }
}
