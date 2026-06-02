import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedAtColumnsIntoPasswordResetAndEmailVerificationEntities1780411916141
	implements MigrationInterface
{
	name = 'AddCreatedAtColumnsIntoPasswordResetAndEmailVerificationEntities1780411916141';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "email_verification" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "password_reset" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "password_reset" DROP COLUMN "createdAt"`);
		await queryRunner.query(`ALTER TABLE "email_verification" DROP COLUMN "createdAt"`);
	}
}
