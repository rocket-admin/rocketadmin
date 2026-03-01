import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCedarPolicyToGroup1771545600000 implements MigrationInterface {
	name = 'AddCedarPolicyToGroup1771545600000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "group" ADD COLUMN "cedarPolicy" text DEFAULT NULL`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "cedarPolicy"`);
	}
}
