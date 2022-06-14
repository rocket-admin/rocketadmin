import {MigrationInterface, QueryRunner} from "typeorm";

export class AddSSHPropertiesInConnectionEntity1603892873380 implements MigrationInterface {
    name = 'AddSSHPropertiesInConnectionEntity1603892873380'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connection" ADD "ssh" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "connection" ADD "privateSSHKey" character varying DEFAULT null`);
        await queryRunner.query(`ALTER TABLE "connection" ADD "sshHost" character varying DEFAULT null`);
        await queryRunner.query(`ALTER TABLE "connection" ADD "sshPort" integer DEFAULT null`);
        await queryRunner.query(`ALTER TABLE "connection" ADD "sshUsername" character varying DEFAULT null`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "sshUsername"`);
        await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "sshPort"`);
        await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "sshHost"`);
        await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "privateSSHKey"`);
        await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "ssh"`);
    }

}
