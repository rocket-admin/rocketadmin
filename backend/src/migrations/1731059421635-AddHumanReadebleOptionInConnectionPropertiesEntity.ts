import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHumanReadebleOptionInConnectionPropertiesEntity1731059421635 implements MigrationInterface {
  name = 'AddHumanReadebleOptionInConnectionPropertiesEntity1731059421635';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "connectionProperties" ADD "human_readable_table_names" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "human_readable_table_names"`);
  }
}
