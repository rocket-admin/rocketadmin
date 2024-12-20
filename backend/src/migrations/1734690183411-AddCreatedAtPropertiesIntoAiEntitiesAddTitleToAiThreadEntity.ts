import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedAtPropertiesIntoAiEntitiesAddTitleToAiThreadEntity1734690183411 implements MigrationInterface {
  name = 'AddCreatedAtPropertiesIntoAiEntitiesAddTitleToAiThreadEntity1734690183411';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ai_user_files" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "ai_user_threads" ADD "title" character varying(128)`);
    await queryRunner.query(`ALTER TABLE "ai_user_threads" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ai_user_threads" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "ai_user_threads" DROP COLUMN "title"`);
    await queryRunner.query(`ALTER TABLE "ai_user_files" DROP COLUMN "createdAt"`);
  }
}
