import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyLogoEntity1743499096176 implements MigrationInterface {
  name = 'AddCompanyLogoEntity1743499096176';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "company_logo" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "logo" bytea, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "companyId" uuid, CONSTRAINT "REL_a92f3f071257d7fdf90eeddf0b" UNIQUE ("companyId"), CONSTRAINT "PK_23de0dcd3f7763e16c418cd8a9c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "company_info" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(
      `ALTER TABLE "company_logo" ADD CONSTRAINT "FK_a92f3f071257d7fdf90eeddf0b6" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_logo" DROP CONSTRAINT "FK_a92f3f071257d7fdf90eeddf0b6"`);
    await queryRunner.query(`ALTER TABLE "company_info" DROP COLUMN "createdAt"`);
    await queryRunner.query(`DROP TABLE "company_logo"`);
  }
}
