import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyFaviconEntity1744184153482 implements MigrationInterface {
  name = 'AddCompanyFaviconEntity1744184153482';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "company_favicon" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "image" bytea, "mimeType" character varying(24) NOT NULL DEFAULT 'image/png', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "companyId" uuid, CONSTRAINT "REL_c7d59fe50a759a6d9c6003d8d0" UNIQUE ("companyId"), CONSTRAINT "PK_c8df420c440781f6a98258cd82e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_favicon" ADD CONSTRAINT "FK_c7d59fe50a759a6d9c6003d8d0a" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_favicon" DROP CONSTRAINT "FK_c7d59fe50a759a6d9c6003d8d0a"`);
    await queryRunner.query(`DROP TABLE "company_favicon"`);
  }
}
