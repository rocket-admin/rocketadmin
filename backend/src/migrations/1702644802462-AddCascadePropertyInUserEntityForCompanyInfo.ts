import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadePropertyInUserEntityForCompanyInfo1702644802462 implements MigrationInterface {
  name = 'AddCascadePropertyInUserEntityForCompanyInfo1702644802462';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_86586021a26d1180b0968f98502"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_86586021a26d1180b0968f98502" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_86586021a26d1180b0968f98502"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_86586021a26d1180b0968f98502" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
