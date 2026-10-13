import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The diagnosis list is CMS's ICD-10-CM release, which has no search keywords,
 * so the column the five seeded codes carried them in goes.
 */
export class Icd10CodesWithoutKeywords1791876516574 implements MigrationInterface {
    name = 'Icd10CodesWithoutKeywords1791876516574'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "icd10_codes" DROP COLUMN "keywords"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "icd10_codes" ADD "keywords" jsonb`);
    }

}
