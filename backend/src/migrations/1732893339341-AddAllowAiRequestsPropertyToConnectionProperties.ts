import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAllowAiRequestsPropertyToConnectionProperties1732893339341 implements MigrationInterface {
    name = 'AddAllowAiRequestsPropertyToConnectionProperties1732893339341'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connectionProperties" ADD "allow_ai_requests" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connectionProperties" DROP COLUMN "allow_ai_requests"`);
    }

}
