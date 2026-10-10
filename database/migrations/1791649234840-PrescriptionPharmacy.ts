import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Each prescription is sent to a pharmacy, and only that pharmacy's
 * pharmacists see and dispense it. Earlier ones get it where it is known:
 * the pharmacy that dispensed it, or the only pharmacy there is. The rest stay
 * empty, and every pharmacy still sees them.
 */
export class PrescriptionPharmacy1791649234840 implements MigrationInterface {
    name = 'PrescriptionPharmacy1791649234840'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medication_requests" ADD "performerOrganizationId" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_e9f7550cbe73cf5fdcff6d0bda" ON "medication_requests"  ("performerOrganizationId") `);
        await queryRunner.query(`
            UPDATE "medication_requests" r
            SET "performerOrganizationId" = d."organizationId"
            FROM "medication_dispenses" d
            WHERE d."medicationRequestId" = r.id::text AND d."organizationId" IS NOT NULL`);
        await queryRunner.query(`
            UPDATE "medication_requests"
            SET "performerOrganizationId" = (SELECT id::text FROM "organizations" WHERE type = 'pharmacy')
            WHERE "performerOrganizationId" IS NULL
              AND (SELECT count(*) FROM "organizations" WHERE type = 'pharmacy') = 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e9f7550cbe73cf5fdcff6d0bda"`);
        await queryRunner.query(`ALTER TABLE "medication_requests" DROP COLUMN "performerOrganizationId"`);
    }

}
