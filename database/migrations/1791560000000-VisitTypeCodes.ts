import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Visit types were free text: the seed wrote "General Consultation", the booking
 * form "Consultation", "Follow-up" and so on. They become the codes the API now
 * accepts (VisitType). OPD and General Consultation are consultations; a review
 * is a follow-up. Anything else, and appointments booked without a type, are left
 * as they are and show as written (or "Not set").
 */
const TO_CODE = `CASE lower(trim("serviceType"))
    WHEN 'consultation' THEN 'consultation'
    WHEN 'general consultation' THEN 'consultation'
    WHEN 'opd' THEN 'consultation'
    WHEN 'follow-up' THEN 'follow_up'
    WHEN 'follow up' THEN 'follow_up'
    WHEN 'review' THEN 'follow_up'
    WHEN 'procedure' THEN 'procedure'
    WHEN 'emergency' THEN 'emergency'
    ELSE "serviceType" END`;

export class VisitTypeCodes1791560000000 implements MigrationInterface {
    name = 'VisitTypeCodes1791560000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const table of ["appointments", "encounters"]) {
            await queryRunner.query(`UPDATE "${table}" SET "serviceType" = ${TO_CODE} WHERE "serviceType" IS NOT NULL`);
        }
    }

    public async down(): Promise<void> {
        // The old free text can't be recovered from the codes, and the codes read fine as they are.
    }

}
