import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadeOptionsGroupEntity1632485867215
  implements MigrationInterface
{
  name = 'AddCascadeOptionsIntoUserAndPermissionsEntities1632485867215';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public"."user_groups_group" DROP CONSTRAINT "FK_84ff6a520aee2bf2512c01cf462"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."permission_groups_group" DROP CONSTRAINT "FK_0dd43db7f5e646262978c3ad0aa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."user" ALTER COLUMN "createdAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."tableLogs" ALTER COLUMN "createdAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."connection" ALTER COLUMN "createdAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."connection" ALTER COLUMN "updatedAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."agent" ALTER COLUMN "createdAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."agent" ALTER COLUMN "updatedAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."user_groups_group" ADD CONSTRAINT "FK_84ff6a520aee2bf2512c01cf462" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."permission_groups_group" ADD CONSTRAINT "FK_0dd43db7f5e646262978c3ad0aa" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public"."permission_groups_group" DROP CONSTRAINT "FK_0dd43db7f5e646262978c3ad0aa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."user_groups_group" DROP CONSTRAINT "FK_84ff6a520aee2bf2512c01cf462"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."agent" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."agent" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."connection" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."connection" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."tableLogs" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."user" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."permission_groups_group" ADD CONSTRAINT "FK_0dd43db7f5e646262978c3ad0aa" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."user_groups_group" ADD CONSTRAINT "FK_84ff6a520aee2bf2512c01cf462" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
