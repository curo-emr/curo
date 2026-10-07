import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Lab staff now work only on their own lab's tests, so they need a lab. Where
 * there is exactly one laboratory, staff who are not at one can only work
 * there, so they are assigned to it; with several, an administrator assigns
 * them. Staff already at a laboratory are left alone.
 */
export class LabStaffToTheOnlyLab1791366600000 implements MigrationInterface {
    name = 'LabStaffToTheOnlyLab1791366600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "practitioners" p
            SET "organizationId" = (SELECT id::text FROM "organizations" WHERE type = 'laboratory')
            WHERE p.role = 'LAB_STAFF'
              AND (SELECT count(*) FROM "organizations" WHERE type = 'laboratory') = 1
              AND NOT EXISTS (
                SELECT 1 FROM "organizations" cur
                WHERE cur.id::text = p."organizationId" AND cur.type = 'laboratory')`);
    }

    public async down(): Promise<void> {
        // Where the staff were before is not recorded; the assignment stays.
    }

}
