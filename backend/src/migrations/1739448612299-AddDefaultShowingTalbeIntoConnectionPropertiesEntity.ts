import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultShowingTalbeIntoConnectionPropertiesEntity1739448612299 implements MigrationInterface {
  name = 'AddDefaultShowingTalbeIntoConnectionPropertiesEntity1739448612299';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "default_showing_table" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "default_showing_table"`);
  }
}
