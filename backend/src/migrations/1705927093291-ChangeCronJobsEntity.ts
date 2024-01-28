import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeCronJobsEntity1705927093291 implements MigrationInterface {
  name = 'ChangeCronJobsEntity1705927093291';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_list" DROP CONSTRAINT "PK_d14e7f19b86450b1cafc689ca41"`);
    await queryRunner.query(`ALTER TABLE "job_list" DROP COLUMN "job_key"`);
    await queryRunner.query(`ALTER TABLE "job_list" ADD "id" integer NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "job_list" ADD CONSTRAINT "PK_5ce383619e96dd36760166222f4" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "job_list" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_list" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "job_list" DROP CONSTRAINT "PK_5ce383619e96dd36760166222f4"`);
    await queryRunner.query(`ALTER TABLE "job_list" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "job_list" ADD "job_key" character varying(100) NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "job_list" ADD CONSTRAINT "PK_d14e7f19b86450b1cafc689ca41" PRIMARY KEY ("job_key")`,
    );
  }
}
