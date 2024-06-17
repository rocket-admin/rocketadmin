import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyEntity1718609595412 implements MigrationInterface {
  name = 'AddApiKeyEntity1718609595412';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_api_key" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "hash" character varying NOT NULL, "userId" uuid, CONSTRAINT "UQ_f25da5419d6477d2550dca5aa8d" UNIQUE ("hash"), CONSTRAINT "PK_9180f9a158e8cda6864358cd462" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_api_key" ADD CONSTRAINT "FK_c6316cc59f67b45ed31310bce53" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_api_key" DROP CONSTRAINT "FK_c6316cc59f67b45ed31310bce53"`);
    await queryRunner.query(`DROP TABLE "user_api_key"`);
  }
}
