import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateUserSecretEntity1763724061000 implements MigrationInterface {
    name = 'CreateUserSecretEntity1763724061000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_secrets" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "companyId" uuid NOT NULL,
            "slug" character varying(255) NOT NULL,
            "encryptedValue" text NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "lastAccessedAt" TIMESTAMP,
            "expiresAt" TIMESTAMP,
            "masterEncryption" boolean NOT NULL DEFAULT false,
            "masterHash" character varying(255),
            CONSTRAINT "PK_user_secrets" PRIMARY KEY ("id")
        )`);

        await queryRunner.query(`CREATE INDEX "IDX_user_secrets_companyId" ON "user_secrets" ("companyId")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_secrets_createdAt" ON "user_secrets" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_secrets_expiresAt" ON "user_secrets" ("expiresAt")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_user_secrets_company_slug" ON "user_secrets" ("companyId", "slug")`);

        await queryRunner.query(`ALTER TABLE "user_secrets" ADD CONSTRAINT "FK_user_secrets_companyId" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_secrets" DROP CONSTRAINT "FK_user_secrets_companyId"`);
        await queryRunner.query(`DROP INDEX "IDX_user_secrets_company_slug"`);
        await queryRunner.query(`DROP INDEX "IDX_user_secrets_expiresAt"`);
        await queryRunner.query(`DROP INDEX "IDX_user_secrets_createdAt"`);
        await queryRunner.query(`DROP INDEX "IDX_user_secrets_companyId"`);
        await queryRunner.query(`DROP TABLE "user_secrets"`);
    }

}
