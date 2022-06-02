import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdentificationFieldsIntoTableSettingsEntity1620390981884 implements MigrationInterface {
  name = 'AddIdentificationFieldsIntoTableSettingsEntity1620390981884';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "identification_fields" character varying array NOT NULL DEFAULT '{}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "identification_fields"`);
  }

}
