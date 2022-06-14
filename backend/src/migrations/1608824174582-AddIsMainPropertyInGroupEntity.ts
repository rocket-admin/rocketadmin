import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsMainPropertyInGroupEntity1608824174582 implements MigrationInterface {
  name = 'AddIsMainPropertyInGroupEntity1608824174582';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "group" ADD "isMain" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "isMain"`);
  }

}
