import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTabTitleEntity1744190012692 implements MigrationInterface {
  name = 'AddTabTitleEntity1744190012692';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "company_tab_title" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "text" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "companyId" uuid, CONSTRAINT "REL_f17247dfca2ba090456a1f8040" UNIQUE ("companyId"), CONSTRAINT "PK_bc41f9fc386503ed484c6c7ca18" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_tab_title" ADD CONSTRAINT "FK_f17247dfca2ba090456a1f80401" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_tab_title" DROP CONSTRAINT "FK_f17247dfca2ba090456a1f80401"`);
    await queryRunner.query(`DROP TABLE "company_tab_title"`);
  }
}
