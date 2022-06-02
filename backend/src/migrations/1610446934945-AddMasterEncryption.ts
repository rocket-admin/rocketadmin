import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMasterEncryption1610446934945 implements MigrationInterface {
  name = 'AddMasterEncryption1610446934945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" ADD "masterEncryption" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "masterEncryption"`);
  }

}
