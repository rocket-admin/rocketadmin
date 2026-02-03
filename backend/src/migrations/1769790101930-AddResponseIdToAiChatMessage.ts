import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResponseIdToAiChatMessage1769790101930 implements MigrationInterface {
	name = 'AddResponseIdToAiChatMessage1769790101930';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "ai_chat_message" ADD "response_id" character varying(255)`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "ai_chat_message" DROP COLUMN "response_id"`);
	}
}
