import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTwoFactorInUserEntity1684929112779 implements MigrationInterface {
  name = 'AddTwoFactorInUserEntity1684929112779';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "isOTPEnabled" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "user" ADD "otpSecretKey" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "otpSecretKey"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isOTPEnabled"`);
  }
}
