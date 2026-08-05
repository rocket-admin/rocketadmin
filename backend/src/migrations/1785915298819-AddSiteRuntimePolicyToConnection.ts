import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSiteRuntimePolicyToConnection1785915298819 implements MigrationInterface {
	name = 'AddSiteRuntimePolicyToConnection1785915298819';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "connection" ADD "site_runtime_policy" jsonb`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "site_runtime_policy"`);
	}
}
