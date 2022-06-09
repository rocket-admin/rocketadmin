import {MigrationInterface, QueryRunner} from "typeorm";

export class InitialMigration1594021894551 implements MigrationInterface {
    name = 'InitialMigration1594021894551'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permission" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "accessLevel" character varying NOT NULL, "tableName" character varying NOT NULL DEFAULT '', CONSTRAINT "PK_3b8b97af9d9d8807e41e6f48362" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "group" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "connectionId" uuid, CONSTRAINT "UQ_c5dcbf6b8ecf068f959a367dc9e" UNIQUE ("connectionId", "title"), CONSTRAINT "PK_256aa0fda9b1de1a73ee0b7106b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "connection" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "description" character varying NOT NULL DEFAULT '', "type" character varying NOT NULL, "host" character varying NOT NULL, "port" integer NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, "database" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "authorId" uuid, CONSTRAINT "PK_be611ce8b8cf439091c82a334b2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "table" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), CONSTRAINT "PK_28914b55c485fc2d7a101b1b2a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "permission_groups_group" ("permissionId" uuid NOT NULL, "groupId" uuid NOT NULL, CONSTRAINT "PK_6fa192288ad79f889c117f7edc1" PRIMARY KEY ("permissionId", "groupId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0dd43db7f5e646262978c3ad0a" ON "permission_groups_group" ("permissionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b78f7697f5b985fc4f40615aaf" ON "permission_groups_group" ("groupId") `);
        await queryRunner.query(`CREATE TABLE "user_groups_group" ("userId" uuid NOT NULL, "groupId" uuid NOT NULL, CONSTRAINT "PK_98d481413dbe5578ad2a45ab863" PRIMARY KEY ("userId", "groupId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_84ff6a520aee2bf2512c01cf46" ON "user_groups_group" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8abdfe8f9d78a4f5e821dbf620" ON "user_groups_group" ("groupId") `);
        await queryRunner.query(`ALTER TABLE "group" ADD CONSTRAINT "FK_fad2f67fd9597d6b81b401f2fa3" FOREIGN KEY ("connectionId") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "connection" ADD CONSTRAINT "FK_e70264c101ff77ebe3380e64c67" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "permission_groups_group" ADD CONSTRAINT "FK_0dd43db7f5e646262978c3ad0aa" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "permission_groups_group" ADD CONSTRAINT "FK_b78f7697f5b985fc4f40615aaf9" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_groups_group" ADD CONSTRAINT "FK_84ff6a520aee2bf2512c01cf462" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_groups_group" ADD CONSTRAINT "FK_8abdfe8f9d78a4f5e821dbf6203" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_groups_group" DROP CONSTRAINT "FK_8abdfe8f9d78a4f5e821dbf6203"`);
        await queryRunner.query(`ALTER TABLE "user_groups_group" DROP CONSTRAINT "FK_84ff6a520aee2bf2512c01cf462"`);
        await queryRunner.query(`ALTER TABLE "permission_groups_group" DROP CONSTRAINT "FK_b78f7697f5b985fc4f40615aaf9"`);
        await queryRunner.query(`ALTER TABLE "permission_groups_group" DROP CONSTRAINT "FK_0dd43db7f5e646262978c3ad0aa"`);
        await queryRunner.query(`ALTER TABLE "connection" DROP CONSTRAINT "FK_e70264c101ff77ebe3380e64c67"`);
        await queryRunner.query(`ALTER TABLE "group" DROP CONSTRAINT "FK_fad2f67fd9597d6b81b401f2fa3"`);
        await queryRunner.query(`DROP INDEX "IDX_8abdfe8f9d78a4f5e821dbf620"`);
        await queryRunner.query(`DROP INDEX "IDX_84ff6a520aee2bf2512c01cf46"`);
        await queryRunner.query(`DROP TABLE "user_groups_group"`);
        await queryRunner.query(`DROP INDEX "IDX_b78f7697f5b985fc4f40615aaf"`);
        await queryRunner.query(`DROP INDEX "IDX_0dd43db7f5e646262978c3ad0a"`);
        await queryRunner.query(`DROP TABLE "permission_groups_group"`);
        await queryRunner.query(`DROP TABLE "table"`);
        await queryRunner.query(`DROP TABLE "connection"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "group"`);
        await queryRunner.query(`DROP TABLE "permission"`);
    }

}
