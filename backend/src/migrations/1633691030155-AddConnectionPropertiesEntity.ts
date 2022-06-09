import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConnectionPropertiesEntity1633691030155 implements MigrationInterface {
  name = 'AddConnectionPropertiesEntity1633691030155';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "connectionProperties"
       (
           "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
           "hidden_tables" character varying array,
           "connectionId"  uuid,
           CONSTRAINT "REL_4c4090f071716a2333a2d5c52c" UNIQUE ("connectionId"),
           CONSTRAINT "PK_bbb7a755c1bfdcacd2e59622f57" PRIMARY KEY ("id")
       )`,
    );
    await queryRunner.query(
      `ALTER TABLE "connectionProperties"
          ADD CONSTRAINT "FK_4c4090f071716a2333a2d5c52ca" FOREIGN KEY ("connectionId") REFERENCES "connection" ("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP CONSTRAINT "FK_4c4090f071716a2333a2d5c52ca"`);
    await queryRunner.query(`DROP TABLE "connectionProperties"`);
  }
}
