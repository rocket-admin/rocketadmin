import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultNullInConnectionCredentialsProperties1622621425033 implements MigrationInterface {
  name = 'SetDefaultNullInConnectionCredentialsProperties1622621425033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "type" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "type" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "host" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "host" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "port" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "port" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "username" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "username" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "password" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "password" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "database" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "database" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "schema" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sid" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "privateSSHKey" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sshHost" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sshPort" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sshUsername" SET DEFAULT null`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "cert" SET DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "cert" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sshUsername" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sshPort" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sshHost" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "privateSSHKey" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sid" SET DEFAULT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "schema" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "database" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "database" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "password" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "password" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "username" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "username" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "port" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "port" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "host" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "host" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "type" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "type" SET NOT NULL`);
  }

}
