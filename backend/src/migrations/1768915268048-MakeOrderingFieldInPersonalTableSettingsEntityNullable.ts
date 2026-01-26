import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeOrderingFieldInPersonalTableSettingsEntityNullable1768915268048 implements MigrationInterface {
	name = 'MakeOrderingFieldInPersonalTableSettingsEntityNullable1768915268048';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "secret_access_logs" DROP CONSTRAINT "FK_secret_access_logs_secretId"`);
		await queryRunner.query(`ALTER TABLE "secret_access_logs" DROP CONSTRAINT "FK_secret_access_logs_userId"`);
		await queryRunner.query(`ALTER TABLE "user_secrets" DROP CONSTRAINT "FK_user_secrets_companyId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_secret_access_logs_secretId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_secret_access_logs_userId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_secret_access_logs_accessedAt"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_user_secrets_companyId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_user_secrets_createdAt"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_user_secrets_expiresAt"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_user_secrets_company_slug"`);
		await queryRunner.query(`ALTER TABLE "personal_table_settings" ALTER COLUMN "ordering" DROP NOT NULL`);
		await queryRunner.query(`ALTER TABLE "personal_table_settings" ALTER COLUMN "ordering" DROP DEFAULT`);
		await queryRunner.query(`CREATE INDEX "IDX_69aeac5d0c61c697346fa2a0f8" ON "secret_access_logs" ("secretId") `);
		await queryRunner.query(`CREATE INDEX "IDX_1d02f2dca9278e9a3925f9e797" ON "secret_access_logs" ("userId") `);
		await queryRunner.query(`CREATE INDEX "IDX_ab33b550d45b31f76ac35a8c67" ON "secret_access_logs" ("accessedAt") `);
		await queryRunner.query(`CREATE INDEX "IDX_8798678e66032251ff48185e96" ON "user_secrets" ("companyId") `);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_f39a47aac503fe096b0c77f2b3" ON "user_secrets" ("companyId", "slug") `,
		);
		await queryRunner.query(
			`ALTER TABLE "secret_access_logs" ADD CONSTRAINT "FK_69aeac5d0c61c697346fa2a0f83" FOREIGN KEY ("secretId") REFERENCES "user_secrets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "secret_access_logs" ADD CONSTRAINT "FK_1d02f2dca9278e9a3925f9e797f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "user_secrets" ADD CONSTRAINT "FK_8798678e66032251ff48185e962" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "user_secrets" DROP CONSTRAINT "FK_8798678e66032251ff48185e962"`);
		await queryRunner.query(`ALTER TABLE "secret_access_logs" DROP CONSTRAINT "FK_1d02f2dca9278e9a3925f9e797f"`);
		await queryRunner.query(`ALTER TABLE "secret_access_logs" DROP CONSTRAINT "FK_69aeac5d0c61c697346fa2a0f83"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_f39a47aac503fe096b0c77f2b3"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_8798678e66032251ff48185e96"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_ab33b550d45b31f76ac35a8c67"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_1d02f2dca9278e9a3925f9e797"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_69aeac5d0c61c697346fa2a0f8"`);
		await queryRunner.query(`ALTER TABLE "personal_table_settings" ALTER COLUMN "ordering" SET DEFAULT 'ASC'`);
		await queryRunner.query(`ALTER TABLE "personal_table_settings" ALTER COLUMN "ordering" SET NOT NULL`);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_user_secrets_company_slug" ON "user_secrets" ("companyId", "slug") `,
		);
		await queryRunner.query(`CREATE INDEX "IDX_user_secrets_expiresAt" ON "user_secrets" ("expiresAt") `);
		await queryRunner.query(`CREATE INDEX "IDX_user_secrets_createdAt" ON "user_secrets" ("createdAt") `);
		await queryRunner.query(`CREATE INDEX "IDX_user_secrets_companyId" ON "user_secrets" ("companyId") `);
		await queryRunner.query(`CREATE INDEX "IDX_secret_access_logs_accessedAt" ON "secret_access_logs" ("accessedAt") `);
		await queryRunner.query(`CREATE INDEX "IDX_secret_access_logs_userId" ON "secret_access_logs" ("userId") `);
		await queryRunner.query(`CREATE INDEX "IDX_secret_access_logs_secretId" ON "secret_access_logs" ("secretId") `);
		await queryRunner.query(
			`ALTER TABLE "user_secrets" ADD CONSTRAINT "FK_user_secrets_companyId" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "secret_access_logs" ADD CONSTRAINT "FK_secret_access_logs_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "secret_access_logs" ADD CONSTRAINT "FK_secret_access_logs_secretId" FOREIGN KEY ("secretId") REFERENCES "user_secrets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}
}
