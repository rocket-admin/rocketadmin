import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCSVPropertiesInTableSettingsEntity1718277289830 implements MigrationInterface {
  name = 'AddCSVPropertiesInTableSettingsEntity1718277289830';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "allow_csv_export" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "allow_csv_import" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "allow_csv_import"`);
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "allow_csv_export"`);
  }
}
