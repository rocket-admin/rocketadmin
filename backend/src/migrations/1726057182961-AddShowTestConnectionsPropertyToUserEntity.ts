import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShowTestConnectionsPropertyToUserEntity1726057182961 implements MigrationInterface {
  name = 'AddShowTestConnectionsPropertyToUserEntity1726057182961';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "showTestConnections" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "showTestConnections"`);
  }
}
