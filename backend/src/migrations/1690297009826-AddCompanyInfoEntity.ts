import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyInfoEntity1690297009826 implements MigrationInterface {
  name = 'AddCompanyInfoEntity1690297009826';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "companyIds" TO "companyId"`);
    await queryRunner.query(
      `CREATE TABLE "company_info" ("id" uuid NOT NULL, CONSTRAINT "PK_88c3e323679d0747ffbb83f3f78" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "connection" ADD "companyId" uuid`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "companyId"`);
    await queryRunner.query(`ALTER TABLE "user" ADD "companyId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_86586021a26d1180b0968f98502" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "connection" ADD CONSTRAINT "FK_3c56723750fad39864878239cf4" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP CONSTRAINT "FK_3c56723750fad39864878239cf4"`);
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_86586021a26d1180b0968f98502"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "companyId"`);
    await queryRunner.query(`ALTER TABLE "user" ADD "companyId" uuid array NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "companyId"`);
    await queryRunner.query(`DROP TABLE "company_info"`);
    await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "companyId" TO "companyIds"`);
  }
}
