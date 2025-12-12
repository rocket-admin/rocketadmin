import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiResponsesToUserEntity1755522332243 implements MigrationInterface {
  name = 'AddAiResponsesToUserEntity1755522332243';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ai_responses_to_user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ai_response_id" character varying(128), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP, "user_id" uuid NOT NULL, CONSTRAINT "PK_15fbf891f35af2e741eb7a6a4c1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_responses_to_user" ADD CONSTRAINT "FK_ccf6477f9644155217bb7698606" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ai_responses_to_user" DROP CONSTRAINT "FK_ccf6477f9644155217bb7698606"`);
    await queryRunner.query(`DROP TABLE "ai_responses_to_user"`);
  }
}
