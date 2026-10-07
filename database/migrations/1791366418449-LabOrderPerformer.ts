import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Each lab order names the lab it was sent to, and only that lab's staff work
 * on it. Orders placed before then name none. Where there is exactly one
 * laboratory, they can only have been for it, so they are given to it; with
 * several, they are left for an administrator to sort out.
 */
export class LabOrderPerformer1791366418449 implements MigrationInterface {
    name = 'LabOrderPerformer1791366418449'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_requests" ADD "performerOrganizationId" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_8e1d151ed1165b7457d11ab8e8" ON "service_requests"  ("performerOrganizationId") `);
        await queryRunner.query(`
            UPDATE "service_requests"
            SET "performerOrganizationId" = (SELECT id::text FROM "organizations" WHERE type = 'laboratory')
            WHERE (SELECT count(*) FROM "organizations" WHERE type = 'laboratory') = 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_8e1d151ed1165b7457d11ab8e8"`);
        await queryRunner.query(`ALTER TABLE "service_requests" DROP COLUMN "performerOrganizationId"`);
    }

}
