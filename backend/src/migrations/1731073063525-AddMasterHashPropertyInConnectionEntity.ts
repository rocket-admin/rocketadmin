import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMasterHashPropertyInConnectionEntity1731073063525 implements MigrationInterface {
  name = 'AddMasterHashPropertyInConnectionEntity1731073063525';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ADD "master_hash" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "master_hash"`);
  }
}
