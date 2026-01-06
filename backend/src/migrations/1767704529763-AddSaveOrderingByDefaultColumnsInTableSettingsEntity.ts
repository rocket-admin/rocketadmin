import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaveOrderingByDefaultColumnsInTableSettingsEntity1767704529763 implements MigrationInterface {
  name = 'AddSaveOrderingByDefaultColumnsInTableSettingsEntity1767704529763';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "save_ordering_by_default_columns" jsonb DEFAULT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "save_ordering_by_default_columns"`);
  }
}

