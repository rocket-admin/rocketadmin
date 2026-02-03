import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadeOptionToConnectionEntity1770045005400 implements MigrationInterface {
	name = 'AddCascadeOptionToConnectionEntity1770045005400';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "connection" DROP CONSTRAINT "FK_3c56723750fad39864878239cf4"`);
		await queryRunner.query(
			`ALTER TABLE "connection" ADD CONSTRAINT "FK_3c56723750fad39864878239cf4" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "connection" DROP CONSTRAINT "FK_3c56723750fad39864878239cf4"`);
		await queryRunner.query(
			`ALTER TABLE "connection" ADD CONSTRAINT "FK_3c56723750fad39864878239cf4" FOREIGN KEY ("companyId") REFERENCES "company_info"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}
}
