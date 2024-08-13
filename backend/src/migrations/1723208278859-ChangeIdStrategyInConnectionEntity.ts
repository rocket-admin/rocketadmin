import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeIdStrategyInConnectionEntity1723208278859 implements MigrationInterface {
  name = 'ChangeIdStrategyInConnectionEntity1723208278859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agent" ADD "temp_connectionId" character varying(38)`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "temp_connectionId" character varying(38)`);
    await queryRunner.query(`ALTER TABLE "group" ADD "temp_connectionId" character varying(38)`);
    await queryRunner.query(`ALTER TABLE "table_info" ADD "temp_connectionId" character varying(38)`);
    await queryRunner.query(`ALTER TABLE "tableLogs" ADD "temp_connectionIdId" character varying(38)`);
    await queryRunner.query(`ALTER TABLE "action_rules" ADD "temp_connection_id" character varying(38)`);
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "temp_connectionIdId" character varying(38)`);

    await queryRunner.query(`UPDATE "agent" SET "temp_connectionId" = "connectionId"`);
    await queryRunner.query(`UPDATE "connectionProperties" SET "temp_connectionId" = "connectionId"`);
    await queryRunner.query(`UPDATE "group" SET "temp_connectionId" = "connectionId"`);
    await queryRunner.query(`UPDATE "table_info" SET "temp_connectionId" = "connectionId"`);
    await queryRunner.query(`UPDATE "tableLogs" SET "temp_connectionIdId" = "connectionIdId"`);
    await queryRunner.query(`UPDATE "action_rules" SET "temp_connection_id" = "connection_id"`);
    await queryRunner.query(`UPDATE "tableSettings" SET "temp_connectionIdId" = "connectionIdId"`);

    await queryRunner.query(`ALTER TABLE "agent" DROP CONSTRAINT "FK_5fa2f66b3adc27993e59ce043e5"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP CONSTRAINT "REL_5fa2f66b3adc27993e59ce043e"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "connectionId"`);
    await queryRunner.query(`ALTER TABLE "agent" ADD "connectionId" character varying(38)`);

    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP CONSTRAINT "FK_4c4090f071716a2333a2d5c52ca"`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP CONSTRAINT "REL_4c4090f071716a2333a2d5c52c"`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "connectionId"`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "connectionId" character varying(38)`);

    await queryRunner.query(`ALTER TABLE "group" DROP CONSTRAINT "FK_fad2f67fd9597d6b81b401f2fa3"`);
    await queryRunner.query(`ALTER TABLE "group" DROP CONSTRAINT "UQ_c5dcbf6b8ecf068f959a367dc9e"`);
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "connectionId"`);
    await queryRunner.query(`ALTER TABLE "group" ADD "connectionId" character varying(38)`);

    await queryRunner.query(`ALTER TABLE "table_info" DROP CONSTRAINT "FK_0b9cf14b1a4c562a84eae8f70f2"`);
    await queryRunner.query(`ALTER TABLE "table_info" DROP COLUMN "connectionId"`);
    await queryRunner.query(`ALTER TABLE "table_info" ADD "connectionId" character varying(38)`);

    await queryRunner.query(`ALTER TABLE "tableLogs" DROP CONSTRAINT "FK_a5dd6c8c66dd42f16aa72b3afd3"`);
    await queryRunner.query(`ALTER TABLE "tableLogs" DROP COLUMN "connectionIdId"`);
    await queryRunner.query(`ALTER TABLE "tableLogs" ADD "connectionIdId" character varying(38)`);

    await queryRunner.query(`ALTER TABLE "action_rules" DROP CONSTRAINT "FK_b4d9e8aa8bb729005941f4cdbac"`);
    await queryRunner.query(`ALTER TABLE "action_rules" DROP COLUMN "connection_id"`);
    await queryRunner.query(`ALTER TABLE "action_rules" ADD "connection_id" character varying(38)`);

    await queryRunner.query(`ALTER TABLE "tableSettings" DROP CONSTRAINT "FK_e959bd443a42403e4a76dcdcbef"`);
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP CONSTRAINT "UQ_5a62e8aec5c74174d8355c34b70"`);
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "connectionIdId"`);
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "connectionIdId" character varying(38)`);

    await queryRunner.query(`ALTER TABLE "table_triggers" DROP CONSTRAINT "FK_937487c7a49aefc776beb196f42"`);

    await queryRunner.query(`ALTER TABLE "connection" ADD COLUMN "temp_id" varchar(38)`);
    await queryRunner.query(`UPDATE "connection" SET "temp_id" = "id"::text`);
    await queryRunner.query(`ALTER TABLE "connection" DROP CONSTRAINT "PK_be611ce8b8cf439091c82a334b2"`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "id" TYPE varchar(38)`);
    await queryRunner.query(`ALTER TABLE "connection" ALTER COLUMN "id" DROP DEFAULT`);
    await queryRunner.query(`UPDATE "connection" SET "id" = "temp_id"`);
    await queryRunner.query(
      `ALTER TABLE "connection" ADD CONSTRAINT "PK_be611ce8b8cf439091c82a334b2" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "temp_id"`);

    await queryRunner.query(`UPDATE "agent" SET "connectionId" = "temp_connectionId"`);
    await queryRunner.query(`UPDATE "connectionProperties" SET "connectionId" = "temp_connectionId"`);
    await queryRunner.query(`UPDATE "group" SET "connectionId" = "temp_connectionId"`);
    await queryRunner.query(`UPDATE "table_info" SET "connectionId" = "temp_connectionId"`);
    await queryRunner.query(`UPDATE "tableLogs" SET "connectionIdId" = "temp_connectionIdId"`);
    await queryRunner.query(`UPDATE "action_rules" SET "connection_id" = "temp_connection_id"`);
    await queryRunner.query(`UPDATE "tableSettings" SET "connectionIdId" = "temp_connectionIdId"`);

    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "temp_connectionId"`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "temp_connectionId"`);
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "temp_connectionId"`);
    await queryRunner.query(`ALTER TABLE "table_info" DROP COLUMN "temp_connectionId"`);
    await queryRunner.query(`ALTER TABLE "tableLogs" DROP COLUMN "temp_connectionIdId"`);
    await queryRunner.query(`ALTER TABLE "action_rules" DROP COLUMN "temp_connection_id"`);
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "temp_connectionIdId"`);

    await queryRunner.query(
      `ALTER TABLE "group" ADD CONSTRAINT "UQ_c5dcbf6b8ecf068f959a367dc9e" UNIQUE ("connectionId", "title")`,
    );
    await queryRunner.query(
      `ALTER TABLE "tableSettings" ADD CONSTRAINT "UQ_5a62e8aec5c74174d8355c34b70" UNIQUE ("connectionIdId", "table_name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_5fa2f66b3adc27993e59ce043e5" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "connectionProperties" ADD CONSTRAINT "FK_4c4090f071716a2333a2d5c52ca" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group" ADD CONSTRAINT "FK_fad2f67fd9597d6b81b401f2fa3" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_info" ADD CONSTRAINT "FK_0b9cf14b1a4c562a84eae8f70f2" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tableLogs" ADD CONSTRAINT "FK_a5dd6c8c66dd42f16aa72b3afd3" FOREIGN KEY ("connectionIdId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_rules" ADD CONSTRAINT "FK_b4d9e8aa8bb729005941f4cdbac" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tableSettings" ADD CONSTRAINT "FK_e959bd443a42403e4a76dcdcbef" FOREIGN KEY ("connectionIdId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "UQ_5fa2f66b3adc27993e59ce043e5" UNIQUE ("connectionId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "connectionProperties" ADD CONSTRAINT "UQ_4c4090f071716a2333a2d5c52ca" UNIQUE ("connectionId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP CONSTRAINT "UQ_4c4090f071716a2333a2d5c52ca"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP CONSTRAINT "UQ_5fa2f66b3adc27993e59ce043e5"`);

    await queryRunner.query(`ALTER TABLE "tableSettings" DROP CONSTRAINT "FK_e959bd443a42403e4a76dcdcbef"`);
    await queryRunner.query(`ALTER TABLE "action_rules" DROP CONSTRAINT "FK_b4d9e8aa8bb729005941f4cdbac"`);
    await queryRunner.query(`ALTER TABLE "tableLogs" DROP CONSTRAINT "FK_a5dd6c8c66dd42f16aa72b3afd3"`);
    await queryRunner.query(`ALTER TABLE "table_info" DROP CONSTRAINT "FK_0b9cf14b1a4c562a84eae8f70f2"`);
    await queryRunner.query(`ALTER TABLE "group" DROP CONSTRAINT "FK_fad2f67fd9597d6b81b401f2fa3"`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP CONSTRAINT "FK_4c4090f071716a2333a2d5c52ca"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP CONSTRAINT "FK_5fa2f66b3adc27993e59ce043e5"`);

    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "temp_connectionIdId" uuid`);
    await queryRunner.query(`UPDATE "tableSettings" SET "temp_connectionIdId" = "connectionIdId"`);
    await queryRunner.query(`ALTER TABLE "action_rules" ADD "temp_connection_id" uuid`);
    await queryRunner.query(`UPDATE "action_rules" SET "temp_connection_id" = "connection_id"`);
    await queryRunner.query(`ALTER TABLE "tableLogs" ADD "temp_connectionIdId" uuid`);
    await queryRunner.query(`UPDATE "tableLogs" SET "temp_connectionIdId" = "connectionIdId"`);
    await queryRunner.query(`ALTER TABLE "table_info" ADD "temp_connectionId" uuid`);
    await queryRunner.query(`UPDATE "table_info" SET "temp_connectionId" = "connectionId"`);
    await queryRunner.query(`ALTER TABLE "group" ADD "temp_connectionId" uuid`);
    await queryRunner.query(`UPDATE "group" SET "temp_connectionId" = "connectionId"`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "temp_connectionId" uuid`);
    await queryRunner.query(`UPDATE "connectionProperties" SET "temp_connectionId" = "connectionId"`);
    await queryRunner.query(`ALTER TABLE "agent" ADD "temp_connectionId" uuid`);
    await queryRunner.query(`UPDATE "agent" SET "temp_connectionId" = "connectionId"`);

    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "connectionIdId"`);
    await queryRunner.query(`ALTER TABLE "tableSettings" ADD "connectionIdId" uuid`);
    await queryRunner.query(`UPDATE "tableSettings" SET "connectionIdId" = "temp_connectionIdId"`);
    await queryRunner.query(`ALTER TABLE "tableSettings" DROP COLUMN "temp_connectionIdId"`);

    await queryRunner.query(`ALTER TABLE "action_rules" DROP COLUMN "connection_id"`);
    await queryRunner.query(`ALTER TABLE "action_rules" ADD "connection_id" uuid`);
    await queryRunner.query(`UPDATE "action_rules" SET "connection_id" = "temp_connection_id"`);
    await queryRunner.query(`ALTER TABLE "action_rules" DROP COLUMN "temp_connection_id"`);

    await queryRunner.query(`ALTER TABLE "tableLogs" DROP COLUMN "connectionIdId"`);
    await queryRunner.query(`ALTER TABLE "tableLogs" ADD "connectionIdId" uuid`);
    await queryRunner.query(`UPDATE "tableLogs" SET "connectionIdId" = "temp_connectionIdId"`);
    await queryRunner.query(`ALTER TABLE "tableLogs" DROP COLUMN "temp_connectionIdId"`);

    await queryRunner.query(`ALTER TABLE "table_info" DROP COLUMN "connectionId"`);
    await queryRunner.query(`ALTER TABLE "table_info" ADD "connectionId" uuid`);
    await queryRunner.query(`UPDATE "table_info" SET "connectionId" = "temp_connectionId"`);
    await queryRunner.query(`ALTER TABLE "table_info" DROP COLUMN "temp_connectionId"`);

    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "connectionId"`);
    await queryRunner.query(`ALTER TABLE "group" ADD "connectionId" uuid`);
    await queryRunner.query(`UPDATE "group" SET "connectionId" = "temp_connectionId"`);
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "temp_connectionId"`);

    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "connectionId"`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "connectionId" uuid`);
    await queryRunner.query(`UPDATE "connectionProperties" SET "connectionId" = "temp_connectionId"`);
    await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "temp_connectionId"`);

    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "connectionId"`);
    await queryRunner.query(`ALTER TABLE "agent" ADD "connectionId" uuid`);
    await queryRunner.query(`UPDATE "agent" SET "connectionId" = "temp_connectionId"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "temp_connectionId"`);

    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_5fa2f66b3adc27993e59ce043e5" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "connectionProperties" ADD CONSTRAINT "FK_4c4090f071716a2333a2d5c52ca" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group" ADD CONSTRAINT "FK_fad2f67fd9597d6b81b401f2fa3" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "table_info" ADD CONSTRAINT "FK_0b9cf14b1a4c562a84eae8f70f2" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tableLogs" ADD CONSTRAINT "FK_a5dd6c8c66dd42f16aa72b3afd3" FOREIGN KEY ("connectionIdId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_rules" ADD CONSTRAINT "FK_b4d9e8aa8bb729005941f4cdbac" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tableSettings" ADD CONSTRAINT "FK_e959bd443a42403e4a76dcdcbef" FOREIGN KEY ("connectionIdId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "UQ_5fa2f66b3adc27993e59ce043e5" UNIQUE ("connectionId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "connectionProperties" ADD CONSTRAINT "UQ_4c4090f071716a2333a2d5c52ca" UNIQUE ("connectionId")`,
    );
  }
}
