import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationEntity1642775235703 implements MigrationInterface {
  name = 'AddEmailVerificationEntity1642775235703';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "email_verification"
                             (
                                 "id"                  uuid NOT NULL DEFAULT uuid_generate_v4(),
                                 "verification_string" character varying,
                                 "userId"              uuid,
                                 CONSTRAINT "REL_95b3bd492c85e471cd5e72277b" UNIQUE ("userId"),
                                 CONSTRAINT "PK_b985a8362d9dac51e3d6120d40e" PRIMARY KEY ("id")
                             )`);
    await queryRunner.query(`ALTER TABLE "email_verification"
        ADD CONSTRAINT "FK_95b3bd492c85e471cd5e72277be" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "email_verification" DROP CONSTRAINT "FK_95b3bd492c85e471cd5e72277be"`);
    await queryRunner.query(`DROP TABLE "email_verification"`);
  }
}
