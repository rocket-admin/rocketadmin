import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuspendedPropertyToUserEntity1710413135309 implements MigrationInterface {
  name = 'AddSuspendedPropertyToUserEntity1710413135309';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "suspended" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "suspended"`);
  }
}
