import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadeOptionForUserEntityInConnectionAndEmailVerificationEntities1647981342982
  implements MigrationInterface
{
  name = 'AddCascadeOptionForUserEntityInConnectionAndEmailVerificationEntities1647981342982';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "email_verification" DROP CONSTRAINT "FK_95b3bd492c85e471cd5e72277be"`);
    await queryRunner.query(`ALTER TABLE "connection" DROP CONSTRAINT "FK_e70264c101ff77ebe3380e64c67"`);
    await queryRunner.query(
      `ALTER TABLE "email_verification" ADD CONSTRAINT "FK_95b3bd492c85e471cd5e72277be" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "connection" ADD CONSTRAINT "FK_e70264c101ff77ebe3380e64c67" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP CONSTRAINT "FK_e70264c101ff77ebe3380e64c67"`);
    await queryRunner.query(`ALTER TABLE "email_verification" DROP CONSTRAINT "FK_95b3bd492c85e471cd5e72277be"`);
    await queryRunner.query(
      `ALTER TABLE "connection" ADD CONSTRAINT "FK_e70264c101ff77ebe3380e64c67" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification" ADD CONSTRAINT "FK_95b3bd492c85e471cd5e72277be" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
