import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedRolePropertyForUserAddedInvitationEntity1695740265059 implements MigrationInterface {
    name = 'AddedRolePropertyForUserAddedInvitationEntity1695740265059'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."invitation_in_company_role_enum" AS ENUM('ADMIN', 'USER')`);
        await queryRunner.query(`CREATE TABLE "invitation_in_company" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "verification_string" character varying, "groupId" character varying, "inviterId" character varying, "invitedUserEmail" character varying, "role" "public"."invitation_in_company_role_enum" NOT NULL DEFAULT 'USER', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "companyId" uuid, CONSTRAINT "PK_b4dd40d00ac78218d9499f1bd7f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('ADMIN', 'USER')`);
        await queryRunner.query(`ALTER TABLE "user" ADD "role" "public"."user_role_enum" NOT NULL DEFAULT 'USER'`);
        await queryRunner.query(`ALTER TABLE "invitation_in_company" ADD CONSTRAINT "FK_1a871b48d2248201b961f3d111c" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invitation_in_company" DROP CONSTRAINT "FK_1a871b48d2248201b961f3d111c"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`DROP TABLE "invitation_in_company"`);
        await queryRunner.query(`DROP TYPE "public"."invitation_in_company_role_enum"`);
    }

}
