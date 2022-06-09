import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailChangeEntity1643279671150 implements MigrationInterface {
  name = 'AddEmailChangeEntity1643279671150';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_change" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "verification_string" character varying, "userId" uuid, CONSTRAINT "REL_60574205c2ff8ad4851c741de1" UNIQUE ("userId"), CONSTRAINT "PK_3c41013cfc6b716e1feeb3c1ee1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_change" ADD CONSTRAINT "FK_60574205c2ff8ad4851c741de1a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "email_change" DROP CONSTRAINT "FK_60574205c2ff8ad4851c741de1a"`);
    await queryRunner.query(`DROP TABLE "email_change"`);
  }
}
