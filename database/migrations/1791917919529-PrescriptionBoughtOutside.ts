import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * A doctor can prescribe a medicine the patient buys at a pharmacy of their
 * choice, which no pharmacy here dispenses. It may be a drug the catalog
 * doesn't list, so a prescription's catalog code becomes optional.
 */
export class PrescriptionBoughtOutside1791917919529 implements MigrationInterface {
    name = 'PrescriptionBoughtOutside1791917919529'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medication_requests" ADD "boughtOutside" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "medication_requests" ALTER COLUMN "medicationCode" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // A drug prescribed by name only keeps its name as its code.
        await queryRunner.query(`UPDATE "medication_requests" SET "medicationCode" = "medicationDisplay" WHERE "medicationCode" IS NULL`);
        await queryRunner.query(`ALTER TABLE "medication_requests" ALTER COLUMN "medicationCode" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "medication_requests" DROP COLUMN "boughtOutside"`);
    }

}
