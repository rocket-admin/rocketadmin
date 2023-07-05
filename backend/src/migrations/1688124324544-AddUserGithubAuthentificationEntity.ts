import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserGithubAuthentificationEntity1688124324544 implements MigrationInterface {
  name = 'AddUserGithubAuthentificationEntity1688124324544';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "github_user_identifier" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gitHubId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "UQ_08cb07e43b5c13aba0d1c57fd45" UNIQUE ("gitHubId"), CONSTRAINT "REL_6458d9fad94d3972fcfdd1628b" UNIQUE ("userId"), CONSTRAINT "PK_2d0dd20c8d9c560de948be5f261" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "github_user_identifier" ADD CONSTRAINT "FK_6458d9fad94d3972fcfdd1628b0" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "github_user_identifier" DROP CONSTRAINT "FK_6458d9fad94d3972fcfdd1628b0"`);
    await queryRunner.query(`DROP TABLE "github_user_identifier"`);
  }
}
