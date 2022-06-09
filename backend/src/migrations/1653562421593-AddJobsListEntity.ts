import {MigrationInterface, QueryRunner} from "typeorm";

export class AddJobsListEntity1653562421593 implements MigrationInterface {
    name = 'AddJobsListEntity1653562421593'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "job_list" ("job_key" character varying(100) NOT NULL, CONSTRAINT "PK_d14e7f19b86450b1cafc689ca41" PRIMARY KEY ("job_key"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "job_list"`);
    }

}
