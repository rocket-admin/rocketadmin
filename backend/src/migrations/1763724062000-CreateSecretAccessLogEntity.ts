import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateSecretAccessLogEntity1763724062000 implements MigrationInterface {
    name = 'CreateSecretAccessLogEntity1763724062000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "secret_access_logs_action_enum" AS ENUM('create', 'view', 'copy', 'update', 'delete')`);

        await queryRunner.query(`CREATE TABLE "secret_access_logs" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "secretId" uuid NOT NULL,
            "userId" uuid NOT NULL,
            "action" "secret_access_logs_action_enum" NOT NULL,
            "accessedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "ipAddress" character varying(45),
            "userAgent" text,
            "success" boolean NOT NULL DEFAULT true,
            "errorMessage" text,
            CONSTRAINT "PK_secret_access_logs" PRIMARY KEY ("id")
        )`);

        await queryRunner.query(`CREATE INDEX "IDX_secret_access_logs_secretId" ON "secret_access_logs" ("secretId")`);
        await queryRunner.query(`CREATE INDEX "IDX_secret_access_logs_userId" ON "secret_access_logs" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_secret_access_logs_accessedAt" ON "secret_access_logs" ("accessedAt")`);

        await queryRunner.query(`ALTER TABLE "secret_access_logs" ADD CONSTRAINT "FK_secret_access_logs_secretId" FOREIGN KEY ("secretId") REFERENCES "user_secrets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "secret_access_logs" ADD CONSTRAINT "FK_secret_access_logs_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "secret_access_logs" DROP CONSTRAINT "FK_secret_access_logs_userId"`);
        await queryRunner.query(`ALTER TABLE "secret_access_logs" DROP CONSTRAINT "FK_secret_access_logs_secretId"`);
        await queryRunner.query(`DROP INDEX "IDX_secret_access_logs_accessedAt"`);
        await queryRunner.query(`DROP INDEX "IDX_secret_access_logs_userId"`);
        await queryRunner.query(`DROP INDEX "IDX_secret_access_logs_secretId"`);
        await queryRunner.query(`DROP TABLE "secret_access_logs"`);
        await queryRunner.query(`DROP TYPE "secret_access_logs_action_enum"`);
    }

}
