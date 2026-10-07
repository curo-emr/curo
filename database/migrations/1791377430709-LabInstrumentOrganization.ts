import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Each instrument is in a lab, and only that lab's staff see and look after
 * it and its QC logs. Where there is exactly one laboratory, earlier
 * instruments can only be in it, so they are given to it; with several, they
 * are left for an administrator to sort out.
 */
export class LabInstrumentOrganization1791377430709 implements MigrationInterface {
    name = 'LabInstrumentOrganization1791377430709'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lab_instruments" ADD "organizationId" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_1563d66c712e6afe963586bc98" ON "lab_instruments"  ("organizationId") `);
        await queryRunner.query(`
            UPDATE "lab_instruments"
            SET "organizationId" = (SELECT id::text FROM "organizations" WHERE type = 'laboratory')
            WHERE (SELECT count(*) FROM "organizations" WHERE type = 'laboratory') = 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1563d66c712e6afe963586bc98"`);
        await queryRunner.query(`ALTER TABLE "lab_instruments" DROP COLUMN "organizationId"`);
    }

}
