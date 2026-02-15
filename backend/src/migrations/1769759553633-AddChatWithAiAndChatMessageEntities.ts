import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatWithAiAndChatMessageEntities1769759553633 implements MigrationInterface {
	name = 'AddChatWithAiAndChatMessageEntities1769759553633';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TYPE "public"."ai_chat_message_role_enum" AS ENUM('user', 'ai', 'system')`);
		await queryRunner.query(
			`CREATE TABLE "ai_chat_message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message" text, "role" "public"."ai_chat_message_role_enum", "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), "ai_chat_id" uuid NOT NULL, CONSTRAINT "PK_55019f66ea41b836f50c5aaf2b3" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TABLE "user_ai_chat" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), "user_id" uuid NOT NULL, CONSTRAINT "PK_6943806be8a75f41c5a7dc6a18d" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`ALTER TABLE "ai_chat_message" ADD CONSTRAINT "FK_03bc49058afd5262d6a503bf123" FOREIGN KEY ("ai_chat_id") REFERENCES "user_ai_chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "user_ai_chat" ADD CONSTRAINT "FK_0f95dbd767d42e637345636cb5d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "user_ai_chat" DROP CONSTRAINT "FK_0f95dbd767d42e637345636cb5d"`);
		await queryRunner.query(`ALTER TABLE "ai_chat_message" DROP CONSTRAINT "FK_03bc49058afd5262d6a503bf123"`);
		await queryRunner.query(`DROP TABLE "user_ai_chat"`);
		await queryRunner.query(`DROP TABLE "ai_chat_message"`);
		await queryRunner.query(`DROP TYPE "public"."ai_chat_message_role_enum"`);
	}
}
