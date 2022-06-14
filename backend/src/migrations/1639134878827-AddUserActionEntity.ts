import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserActionEntity1639134878827 implements MigrationInterface {
  name = 'AddUserActionEntity1639134878827';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_action" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "mail_sent" boolean NOT NULL DEFAULT false, "userId" uuid, CONSTRAINT "REL_c025478b45e60017ed10c77f99" UNIQUE ("userId"), CONSTRAINT "PK_d035e078f4d722c689a98556169" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_action" ADD CONSTRAINT "FK_c025478b45e60017ed10c77f99c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_action" DROP CONSTRAINT "FK_c025478b45e60017ed10c77f99c"`);
    await queryRunner.query(`DROP TABLE "user_action"`);
  }
}
