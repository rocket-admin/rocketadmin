import {MigrationInterface, QueryRunner} from "typeorm";

export class AddGclidColumnInUserEntity1613652980675 implements MigrationInterface {
    name = 'AddGclidColumnInUserEntity1613652980675'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "gclid" character varying DEFAULT null`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "gclid"`);
    }

}
