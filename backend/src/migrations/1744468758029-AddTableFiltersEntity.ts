import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTableFiltersEntity1744468758029 implements MigrationInterface {
  name = 'AddTableFiltersEntity1744468758029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "table_filters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "filters" jsonb, "table_name" character varying, "connectionId" character varying NOT NULL, CONSTRAINT "UQ_86da06a7ee22ca03ec25bf681de" UNIQUE ("connectionId", "table_name"), CONSTRAINT "PK_3e08a731402b35d32fe6f062c13" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_filters" ADD CONSTRAINT "FK_e4b16eddf2b9b90d5776b9652fc" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_filters" DROP CONSTRAINT "FK_e4b16eddf2b9b90d5776b9652fc"`);
    await queryRunner.query(`DROP TABLE "table_filters"`);
  }
}
