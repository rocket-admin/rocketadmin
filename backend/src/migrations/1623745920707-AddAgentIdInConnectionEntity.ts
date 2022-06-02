import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentIdInConnectionEntity1623745920707 implements MigrationInterface {
  name = 'AddAgentIdInConnectionEntity1623745920707';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "columns_view" character varying array DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "columns_view"`);
  }

}
