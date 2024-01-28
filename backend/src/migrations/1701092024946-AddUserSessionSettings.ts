import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSessionSettings1701092024946 implements MigrationInterface {
  name = 'AddUserSessionSettings1701092024946';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_session_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "userSettings" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6cc8775feee5687ec999d8a1e5c" UNIQUE ("userId"), CONSTRAINT "PK_09fce02394b4e15e98cf84ba69c" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_session_settings"`);
  }
}
