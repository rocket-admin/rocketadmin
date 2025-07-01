import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDataCenterInConnectionEntity1750931986538 implements MigrationInterface {
  name = 'AddDataCenterInConnectionEntity1750931986538';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ADD "dataCenter" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "dataCenter"`);
  }
}
