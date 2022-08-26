import { MigrationInterface, QueryRunner } from 'typeorm';

export class CharacterMaximumLengthTypeChangedToString1661518838769 implements MigrationInterface {
  name = 'CharacterMaximumLengthTypeChangedToString1661518838769';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_field_info" DROP COLUMN "character_maximum_length"`);
    await queryRunner.query(`ALTER TABLE "table_field_info"
      ADD "character_maximum_length" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "table_field_info" DROP COLUMN "character_maximum_length"`);
    await queryRunner.query(`ALTER TABLE "table_field_info"
      ADD "character_maximum_length" integer`);
  }
}
