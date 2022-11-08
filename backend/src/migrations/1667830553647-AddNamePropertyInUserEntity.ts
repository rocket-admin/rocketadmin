import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNamePropertyInUserEntity1667830553647 implements MigrationInterface {
    name = 'AddNamePropertyInUserEntity1667830553647'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "name" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "name"`);
    }

}
