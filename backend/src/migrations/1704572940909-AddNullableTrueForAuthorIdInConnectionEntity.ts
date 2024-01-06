import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNullableTrueForAuthorIdInConnectionEntity1704572940909 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "authorId" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "authorId" SET NOT NULL`);
  }
}
