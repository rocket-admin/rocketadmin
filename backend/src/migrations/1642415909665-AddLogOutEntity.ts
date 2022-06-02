import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLogOutEntity1642415909665 implements MigrationInterface {
  name = 'AddLogOutEntity1642415909665';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "logout" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "jwtToken" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3c94c20f1447defd40481d1aca3" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "logout"`);
  }
}
