import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedCascadeOptionToAiChatEntities1770043047971 implements MigrationInterface {
	name = 'AddedCascadeOptionToAiChatEntities1770043047971';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "ai_chat_message" DROP CONSTRAINT "FK_03bc49058afd5262d6a503bf123"`);
		await queryRunner.query(`ALTER TABLE "user_ai_chat" DROP CONSTRAINT "FK_0f95dbd767d42e637345636cb5d"`);
		await queryRunner.query(
			`ALTER TABLE "ai_chat_message" ADD CONSTRAINT "FK_03bc49058afd5262d6a503bf123" FOREIGN KEY ("ai_chat_id") REFERENCES "user_ai_chat"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "user_ai_chat" ADD CONSTRAINT "FK_0f95dbd767d42e637345636cb5d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "user_ai_chat" DROP CONSTRAINT "FK_0f95dbd767d42e637345636cb5d"`);
		await queryRunner.query(`ALTER TABLE "ai_chat_message" DROP CONSTRAINT "FK_03bc49058afd5262d6a503bf123"`);
		await queryRunner.query(
			`ALTER TABLE "user_ai_chat" ADD CONSTRAINT "FK_0f95dbd767d42e637345636cb5d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "ai_chat_message" ADD CONSTRAINT "FK_03bc49058afd5262d6a503bf123" FOREIGN KEY ("ai_chat_id") REFERENCES "user_ai_chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}
}
