import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedExternalProviderRegistrationPropertyInUserEntity1702029067334 implements MigrationInterface {
  name = 'AddedExternalProviderRegistrationPropertyInUserEntity1702029067334';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_externalregistrationprovider_enum" AS ENUM('GOOGLE', 'GITHUB')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "externalRegistrationProvider" "public"."user_externalregistrationprovider_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "externalRegistrationProvider"`);
    await queryRunner.query(`DROP TYPE "public"."user_externalregistrationprovider_enum"`);
  }
}
