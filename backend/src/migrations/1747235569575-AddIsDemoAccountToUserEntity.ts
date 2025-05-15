import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsDemoAccountToUserEntity1747235569575 implements MigrationInterface {
  name = 'AddIsDemoAccountToUserEntity1747235569575';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "isDemoAccount" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isDemoAccount"`);
  }
}
