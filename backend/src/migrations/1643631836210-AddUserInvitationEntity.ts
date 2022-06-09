import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserInvitationEntity1643631836210 implements MigrationInterface {
  name = 'AddUserInvitationEntity1643631836210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_invitation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "verification_string" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "REL_494861800ebf740c1cf9f110e5" UNIQUE ("userId"), CONSTRAINT "PK_41026b90b70299ac5dc0183351a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitation" ADD CONSTRAINT "FK_494861800ebf740c1cf9f110e5e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_invitation" DROP CONSTRAINT "FK_494861800ebf740c1cf9f110e5e"`);
    await queryRunner.query(`DROP TABLE "user_invitation"`);
  }
}
