import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMimeTypeToCompanyLogoEntityRenameLogoProperty1743598451177 implements MigrationInterface {
  name = 'AddMimeTypeToCompanyLogoEntityRenameLogoProperty1743598451177';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_logo" RENAME COLUMN "logo" TO "image"`);
    await queryRunner.query(
      `ALTER TABLE "company_logo" ADD "mimeType" character varying(24) NOT NULL DEFAULT 'image/png'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_logo" DROP COLUMN "mimeType"`);
    await queryRunner.query(`ALTER TABLE "company_logo" RENAME COLUMN "image" TO "logo"`);
  }
}
