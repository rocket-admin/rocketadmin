import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiThreadAndAiFileEntities1734344160864 implements MigrationInterface {
  name = 'AddAiThreadAndAiFileEntities1734344160864';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ai_user_files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "file_ai_id" character varying(128) NOT NULL, "threadId" uuid, CONSTRAINT "REL_0cfe8c83471aacc78bb6bf0d99" UNIQUE ("threadId"), CONSTRAINT "PK_cad85eaa0e7888a70c543aea5ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_user_threads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "thread_ai_id" character varying(128) NOT NULL, "userId" uuid, CONSTRAINT "PK_456c9992092ab18f4281ba54fd5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_user_files" ADD CONSTRAINT "FK_0cfe8c83471aacc78bb6bf0d994" FOREIGN KEY ("threadId") REFERENCES "ai_user_threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_user_threads" ADD CONSTRAINT "FK_90c549b96a3d29de5e38318e760" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ai_user_threads" DROP CONSTRAINT "FK_90c549b96a3d29de5e38318e760"`);
    await queryRunner.query(`ALTER TABLE "ai_user_files" DROP CONSTRAINT "FK_0cfe8c83471aacc78bb6bf0d994"`);
    await queryRunner.query(`DROP TABLE "ai_user_threads"`);
    await queryRunner.query(`DROP TABLE "ai_user_files"`);
  }
}
