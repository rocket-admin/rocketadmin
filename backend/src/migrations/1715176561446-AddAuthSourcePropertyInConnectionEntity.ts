import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSourcePropertyInConnectionEntity1715176561446 implements MigrationInterface {
  name = 'AddAuthSourcePropertyInConnectionEntity1715176561446';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ADD "authSource" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "authSource"`);
  }
}
