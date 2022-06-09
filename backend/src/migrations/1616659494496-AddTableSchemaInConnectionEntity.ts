import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTableSchemaInConnectionEntity1616659494496 implements MigrationInterface {
  name = 'AddTableSchemaInConnectionEntity1616659494496';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ADD "schema" character varying DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "schema"`);
  }

}
