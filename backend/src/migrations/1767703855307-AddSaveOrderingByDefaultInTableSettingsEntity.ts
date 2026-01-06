import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaveOrderingByDefaultInTableSettingsEntity1767703855307 implements MigrationInterface {
  name = 'AddSaveOrderingByDefaultInTableSettingsEntity1767703855307';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "save_ordering_by_default" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "save_ordering_by_default"`);
  }
}

