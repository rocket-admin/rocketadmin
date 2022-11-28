import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerIdFieldInUserInvitationEntity1669212083676 implements MigrationInterface {
  name = 'AddOwnerIdFieldInUserInvitationEntity1669212083676';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_invitation" ADD "ownerId" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_invitation" DROP COLUMN "ownerId"`);
  }
}
