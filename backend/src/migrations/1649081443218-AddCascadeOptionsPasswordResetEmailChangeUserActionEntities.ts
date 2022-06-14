import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadeOptionsPasswordResetEmailChangeUserActionEntities1649081443218 implements MigrationInterface {
  name = 'AddCascadeOptionsPasswordResetEmailChangeUserActionEntities1649081443218';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_action" DROP CONSTRAINT "FK_c025478b45e60017ed10c77f99c"`);
    await queryRunner.query(`ALTER TABLE "password_reset" DROP CONSTRAINT "FK_05baebe80e9f8fab8207eda250c"`);
    await queryRunner.query(`ALTER TABLE "email_change" DROP CONSTRAINT "FK_60574205c2ff8ad4851c741de1a"`);
    await queryRunner.query(`ALTER TABLE "user_invitation" DROP CONSTRAINT "FK_494861800ebf740c1cf9f110e5e"`);
    await queryRunner.query(
      `ALTER TABLE "user_action" ADD CONSTRAINT "FK_c025478b45e60017ed10c77f99c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" ADD CONSTRAINT "FK_05baebe80e9f8fab8207eda250c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_change" ADD CONSTRAINT "FK_60574205c2ff8ad4851c741de1a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitation" ADD CONSTRAINT "FK_494861800ebf740c1cf9f110e5e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_invitation" DROP CONSTRAINT "FK_494861800ebf740c1cf9f110e5e"`);
    await queryRunner.query(`ALTER TABLE "email_change" DROP CONSTRAINT "FK_60574205c2ff8ad4851c741de1a"`);
    await queryRunner.query(`ALTER TABLE "password_reset" DROP CONSTRAINT "FK_05baebe80e9f8fab8207eda250c"`);
    await queryRunner.query(`ALTER TABLE "user_action" DROP CONSTRAINT "FK_c025478b45e60017ed10c77f99c"`);
    await queryRunner.query(
      `ALTER TABLE "user_invitation" ADD CONSTRAINT "FK_494861800ebf740c1cf9f110e5e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_change" ADD CONSTRAINT "FK_60574205c2ff8ad4851c741de1a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" ADD CONSTRAINT "FK_05baebe80e9f8fab8207eda250c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_action" ADD CONSTRAINT "FK_c025478b45e60017ed10c77f99c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
