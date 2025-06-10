import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSamlPropertiesToUserEntity1748002305012 implements MigrationInterface {
  name = 'AddSamlPropertiesToUserEntity1748002305012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "samlNameId" character varying`);
    await queryRunner.query(
      `ALTER TYPE "public"."user_externalregistrationprovider_enum" RENAME TO "user_externalregistrationprovider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_externalregistrationprovider_enum" AS ENUM('GOOGLE', 'GITHUB', 'SAML')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "externalRegistrationProvider" TYPE "public"."user_externalregistrationprovider_enum" USING "externalRegistrationProvider"::"text"::"public"."user_externalregistrationprovider_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_externalregistrationprovider_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_externalregistrationprovider_enum_old" AS ENUM('GOOGLE', 'GITHUB')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "externalRegistrationProvider" TYPE "public"."user_externalregistrationprovider_enum_old" USING "externalRegistrationProvider"::"text"::"public"."user_externalregistrationprovider_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_externalregistrationprovider_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."user_externalregistrationprovider_enum_old" RENAME TO "user_externalregistrationprovider_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "samlNameId"`);
  }
}
