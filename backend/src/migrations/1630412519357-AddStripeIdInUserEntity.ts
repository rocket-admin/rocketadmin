import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeIdInUserEntity1630412519357 implements MigrationInterface {
  name = 'AddStripeIdInUserEntity1630412519357';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user"
        ADD "stripeId" character varying DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user"
        DROP COLUMN "stripeId"`);
  }

}
