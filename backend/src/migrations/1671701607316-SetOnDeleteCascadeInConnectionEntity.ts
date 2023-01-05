import { MigrationInterface, QueryRunner } from "typeorm";

export class SetOnDeleteCascadeInConnectionEntity1671701607316 implements MigrationInterface {
    name = 'SetOnDeleteCascadeInConnectionEntity1671701607316'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connection" DROP CONSTRAINT "FK_e70264c101ff77ebe3380e64c67"`);
        await queryRunner.query(`ALTER TABLE "connection" ADD CONSTRAINT "FK_e70264c101ff77ebe3380e64c67" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connection" DROP CONSTRAINT "FK_e70264c101ff77ebe3380e64c67"`);
        await queryRunner.query(`ALTER TABLE "connection" ADD CONSTRAINT "FK_e70264c101ff77ebe3380e64c67" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
