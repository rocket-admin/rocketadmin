import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsTestConnectionPropertyInConnectionEntity1624962711767 implements MigrationInterface {
  name = 'AddIsTestConnectionPropertyInConnectionEntity1624962711767';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ADD "isTestConnection" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "isTestConnection"`);
  }

}
