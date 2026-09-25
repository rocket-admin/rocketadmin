import { MigrationInterface, QueryRunner } from 'typeorm';

// The demo-account regime (passwordless throwaway users created through POST /saas/user/demo/register)
// is gone from the frontend, the SaaS service and the core; the flag that marked those rows goes with it.
export class DropIsDemoAccountFromUserEntity1790343620550 implements MigrationInterface {
	name = 'DropIsDemoAccountFromUserEntity1790343620550';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isDemoAccount"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "user" ADD "isDemoAccount" boolean NOT NULL DEFAULT false`);
	}
}
