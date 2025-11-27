import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignInAuditEntity1764166925419 implements MigrationInterface {
  name = 'AddSignInAuditEntity1764166925419';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."signInAudit_status_enum" AS ENUM('success', 'failed', 'blocked')`);
    await queryRunner.query(
      `CREATE TYPE "public"."signInAudit_signinmethod_enum" AS ENUM('email', 'google', 'github', 'saml', 'otp')`,
    );
    await queryRunner.query(
      `CREATE TABLE "signInAudit" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying, "status" "public"."signInAudit_status_enum" NOT NULL DEFAULT 'success', "signInMethod" "public"."signInAudit_signinmethod_enum" NOT NULL DEFAULT 'email', "ipAddress" character varying, "userAgent" character varying, "failureReason" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid NOT NULL, CONSTRAINT "PK_7da6fabf99add8472fb25327a13" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "signInAudit" ADD CONSTRAINT "FK_f0574f10d690de5779e74563f8f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signInAudit" DROP CONSTRAINT "FK_f0574f10d690de5779e74563f8f"`);
    await queryRunner.query(`DROP TABLE "signInAudit"`);
    await queryRunner.query(`DROP TYPE "public"."signInAudit_signinmethod_enum"`);
    await queryRunner.query(`DROP TYPE "public"."signInAudit_status_enum"`);
  }
}
