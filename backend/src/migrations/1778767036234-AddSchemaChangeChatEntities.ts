import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchemaChangeChatEntities1778767036234 implements MigrationInterface {
	name = 'AddSchemaChangeChatEntities1778767036234';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "schema_change_chat" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), "user_id" uuid NOT NULL, "connection_id" character varying(38) NOT NULL, "last_batch_id" uuid, CONSTRAINT "PK_60082e3e240c265fc043290381d" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TYPE "public"."schema_change_chat_message_role_enum" AS ENUM('user', 'ai', 'system')`,
		);
		await queryRunner.query(
			`CREATE TABLE "schema_change_chat_message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message" text, "role" "public"."schema_change_chat_message_role_enum", "batch_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), "chat_id" uuid NOT NULL, CONSTRAINT "PK_5984cdb248fa9c2f55f5a19022c" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(`ALTER TABLE "ai_chat_message" DROP COLUMN "response_id"`);
		await queryRunner.query(
			`ALTER TABLE "schema_change_chat" ADD CONSTRAINT "FK_4dbf7dad457505747189fb98d7e" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "schema_change_chat" ADD CONSTRAINT "FK_9f9acf0578fcf239576640d7b7b" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "schema_change_chat_message" ADD CONSTRAINT "FK_32825f4780664738f60fa75cd50" FOREIGN KEY ("chat_id") REFERENCES "schema_change_chat"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "schema_change_chat_message" DROP CONSTRAINT "FK_32825f4780664738f60fa75cd50"`,
		);
		await queryRunner.query(`ALTER TABLE "schema_change_chat" DROP CONSTRAINT "FK_9f9acf0578fcf239576640d7b7b"`);
		await queryRunner.query(`ALTER TABLE "schema_change_chat" DROP CONSTRAINT "FK_4dbf7dad457505747189fb98d7e"`);
		await queryRunner.query(`ALTER TABLE "ai_chat_message" ADD "response_id" character varying(255)`);
		await queryRunner.query(`DROP TABLE "schema_change_chat_message"`);
		await queryRunner.query(`DROP TYPE "public"."schema_change_chat_message_role_enum"`);
		await queryRunner.query(`DROP TABLE "schema_change_chat"`);
	}
}
