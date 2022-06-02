import {MigrationInterface, QueryRunner} from "typeorm";

export class AddSID1597314058608 implements MigrationInterface {
    name = 'AddSID1597314058608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connection" ADD COLUMN "sid" VARCHAR(255) DEFAULT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "sid"`);
    }

}
