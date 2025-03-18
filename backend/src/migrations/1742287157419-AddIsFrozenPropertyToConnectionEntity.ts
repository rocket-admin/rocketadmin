import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsFrozenPropertyToConnectionEntity1742287157419 implements MigrationInterface {
  name = 'AddIsFrozenPropertyToConnectionEntity1742287157419';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ADD "is_frozen" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "is_frozen"`);
  }
}
