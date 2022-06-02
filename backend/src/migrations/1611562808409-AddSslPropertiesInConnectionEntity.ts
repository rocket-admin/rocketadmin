import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSslPropertiesInConnectionEntity1611562808409 implements MigrationInterface {
  name = 'AddSslPropertiesInConnectionEntity1611562808409';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ADD "ssl" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "connection" ADD "cert" character varying DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "cert"`);
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "ssl"`);
  }

}
