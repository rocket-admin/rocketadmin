import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicCedarPolicyToConnection1781536092947 implements MigrationInterface {
	name = 'AddPublicCedarPolicyToConnection1781536092947';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "connection" ADD "public_cedar_policy" text`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "connection" DROP COLUMN "public_cedar_policy"`);
	}
}
