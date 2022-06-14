import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgentEntity1622621082756 implements MigrationInterface {
  name = 'CreateAgentEntity1622621082756';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "agent" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "connectionId" uuid, CONSTRAINT "REL_5fa2f66b3adc27993e59ce043e" UNIQUE ("connectionId"), CONSTRAINT "PK_1000e989398c5d4ed585cf9a46f" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "agent" ADD CONSTRAINT "FK_5fa2f66b3adc27993e59ce043e5" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agent" DROP CONSTRAINT "FK_5fa2f66b3adc27993e59ce043e5"`);
    await queryRunner.query(`DROP TABLE "agent"`);
  }
}
