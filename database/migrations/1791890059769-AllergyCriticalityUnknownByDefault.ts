import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * An allergy recorded without a severity is of unknown risk, not low risk.
 * Allergies already saved keep the criticality they have.
 */
export class AllergyCriticalityUnknownByDefault1791890059769 implements MigrationInterface {
    name = 'AllergyCriticalityUnknownByDefault1791890059769'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "allergy_intolerances" ALTER COLUMN "criticality" SET DEFAULT 'unable-to-assess'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "allergy_intolerances" ALTER COLUMN "criticality" SET DEFAULT 'low'`);
    }

}
