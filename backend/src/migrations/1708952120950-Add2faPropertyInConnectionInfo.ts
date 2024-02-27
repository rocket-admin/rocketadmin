import { MigrationInterface, QueryRunner } from 'typeorm';

export class Add2faPropertyInConnectionInfo1708952120950 implements MigrationInterface {
  name = 'Add2faPropertyInConnectionInfo1708952120950';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_info" ADD "is2faEnabled" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_info" DROP COLUMN "is2faEnabled"`);
  }
}
