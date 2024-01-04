import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedCascadeOptionForAuthorInConnectionEntity1704385127896 implements MigrationInterface {
  name = 'AddedCascadeOptionForAuthorInConnectionEntity1704385127896';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP CONSTRAINT "FK_e70264c101ff77ebe3380e64c67"`);
    await queryRunner.query(
      `ALTER TABLE "connection" ADD CONSTRAINT "FK_e70264c101ff77ebe3380e64c67" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "connection" DROP CONSTRAINT "FK_e70264c101ff77ebe3380e64c67"`);
    await queryRunner.query(
      `ALTER TABLE "connection" ADD CONSTRAINT "FK_e70264c101ff77ebe3380e64c67" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
