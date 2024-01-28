import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovedStripeIdFromUserEntity1704808026942 implements MigrationInterface {
  name = 'RemovedStripeIdFromUserEntity1704808026942';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "stripeId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "stripeId" character varying`);
  }
}
