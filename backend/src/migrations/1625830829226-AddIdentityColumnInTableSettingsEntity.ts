import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdentityColumnInTableSettingsEntity1625830829226 implements MigrationInterface {
  name = 'AddIdentityColumnInTableSettingsEntity1625830829226';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "identity_column" character varying DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "identity_column"`);
  }
}
