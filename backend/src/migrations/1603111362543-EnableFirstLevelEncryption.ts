import {MigrationInterface, QueryRunner} from "typeorm";

export class EnableFirstLevelEncryption1603111362543 implements MigrationInterface {
    name = 'EnableFirstLevelEncryption1603111362543'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tableSettings" DROP CONSTRAINT "UQ_5a62e8aec5c74174d8355c34b70"`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ALTER COLUMN "table_name" SET DEFAULT null`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ALTER COLUMN "display_name" SET DEFAULT null`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ALTER COLUMN "list_per_page" SET DEFAULT null`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ALTER COLUMN "ordering_field" SET DEFAULT null`);
        await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sid" SET DEFAULT null`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ADD CONSTRAINT "UQ_5a62e8aec5c74174d8355c34b70" UNIQUE ("connectionIdId", "table_name")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tableSettings" DROP CONSTRAINT "UQ_5a62e8aec5c74174d8355c34b70"`);
        await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "sid" SET DEFAULT NULL`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ALTER COLUMN "ordering_field" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ALTER COLUMN "list_per_page" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ALTER COLUMN "display_name" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ALTER COLUMN "table_name" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tableSettings" ADD CONSTRAINT "UQ_5a62e8aec5c74174d8355c34b70" UNIQUE ("table_name", "connectionIdId")`);
    }

}
