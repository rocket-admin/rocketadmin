import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDBAdminRoleToUserRoles1740129586002 implements MigrationInterface {
  name = 'AddDBAdminRoleToUserRoles1740129586002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."invitation_in_company_role_enum" RENAME TO "invitation_in_company_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invitation_in_company_role_enum" AS ENUM('ADMIN', 'USER', 'DB_ADMIN')`,
    );
    await queryRunner.query(`ALTER TABLE "invitation_in_company" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "invitation_in_company" ALTER COLUMN "role" TYPE "public"."invitation_in_company_role_enum" USING "role"::"text"::"public"."invitation_in_company_role_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "invitation_in_company" ALTER COLUMN "role" SET DEFAULT 'USER'`);
    await queryRunner.query(`DROP TYPE "public"."invitation_in_company_role_enum_old"`);
    await queryRunner.query(`ALTER TYPE "public"."user_role_enum" RENAME TO "user_role_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('ADMIN', 'USER', 'DB_ADMIN')`);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum" USING "role"::"text"::"public"."user_role_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER'`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."user_role_enum_old" AS ENUM('ADMIN', 'USER')`);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum_old" USING "role"::"text"::"public"."user_role_enum_old"`,
    );
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER'`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."user_role_enum_old" RENAME TO "user_role_enum"`);
    await queryRunner.query(`CREATE TYPE "public"."invitation_in_company_role_enum_old" AS ENUM('ADMIN', 'USER')`);
    await queryRunner.query(`ALTER TABLE "invitation_in_company" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "invitation_in_company" ALTER COLUMN "role" TYPE "public"."invitation_in_company_role_enum_old" USING "role"::"text"::"public"."invitation_in_company_role_enum_old"`,
    );
    await queryRunner.query(`ALTER TABLE "invitation_in_company" ALTER COLUMN "role" SET DEFAULT 'USER'`);
    await queryRunner.query(`DROP TYPE "public"."invitation_in_company_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."invitation_in_company_role_enum_old" RENAME TO "invitation_in_company_role_enum"`,
    );
  }
}
