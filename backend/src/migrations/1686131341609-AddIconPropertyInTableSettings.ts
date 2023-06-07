import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIconPropertyInTableSettings1686131341609 implements MigrationInterface {
  name = 'AddIconPropertyInTableSettings1686131341609';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "icon" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "icon"`);
  }
}
