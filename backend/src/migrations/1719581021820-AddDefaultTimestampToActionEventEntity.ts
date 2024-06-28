import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultTimestampToActionEventEntity1719581021820 implements MigrationInterface {
  name = 'AddDefaultTimestampToActionEventEntity1719581021820';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_events" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "action_events" ALTER COLUMN "created_at" SET DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "action_events" ALTER COLUMN "created_at" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "action_events" ALTER COLUMN "created_at" DROP NOT NULL`);
  }
}
