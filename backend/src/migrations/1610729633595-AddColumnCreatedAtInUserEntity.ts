import {MigrationInterface, QueryRunner} from "typeorm";

export class AddColumnCreatedAtInUserEntity1610729633595 implements MigrationInterface {
    name = 'AddColumnCreatedAtInUserEntity1610729633595'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "createdAt"`);
    }

}
