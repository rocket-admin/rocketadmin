import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReworkTableFiltersEntity1744639769722 implements MigrationInterface {
  name = 'ReworkTableFiltersEntity1744639769722';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_filters" DROP CONSTRAINT "UQ_86da06a7ee22ca03ec25bf681de"`);
    await queryRunner.query(`ALTER TABLE "table_filters" ADD "name" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "table_filters" ADD "dynamic_filter_column_name" character varying(255)`);
    await queryRunner.query(
      `CREATE TYPE "public"."table_filters_dynamic_filter_comparator_enum" AS ENUM('startswith', 'endswith', 'gt', 'lt', 'lte', 'gte', 'contains', 'icontains', 'eq', 'empty')`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_filters" ADD "dynamic_filter_comparator" "public"."table_filters_dynamic_filter_comparator_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "table_filters" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "table_filters" ADD "updatedAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_filters" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "table_filters" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "table_filters" DROP COLUMN "dynamic_filter_comparator"`);
    await queryRunner.query(`DROP TYPE "public"."table_filters_dynamic_filter_comparator_enum"`);
    await queryRunner.query(`ALTER TABLE "table_filters" DROP COLUMN "dynamic_filter_column_name"`);
    await queryRunner.query(`ALTER TABLE "table_filters" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "table_filters" ADD CONSTRAINT "UQ_86da06a7ee22ca03ec25bf681de" UNIQUE ("table_name", "connectionId")`,
    );
  }
}
