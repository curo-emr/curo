import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Diagnosis searches match words anywhere in a code or name (ILIKE '%…%'),
 * which a b-tree can't serve: over the ~75,000 ICD-10-CM codes each search
 * read the whole table. Trigram indexes serve them (pg_trgm is a trusted
 * extension, so the database owner can enable it). The extension is left in
 * place on revert, as other tables may come to use it.
 */
export class Icd10CodesTrigramSearch1791877029627 implements MigrationInterface {
    name = 'Icd10CodesTrigramSearch1791877029627'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d689209e0449acea80b52a0dd6"`);
        await queryRunner.query(`CREATE INDEX "icd10_codes_code_trgm" ON "icd10_codes" USING gin ("code" gin_trgm_ops)`);
        await queryRunner.query(`CREATE INDEX "icd10_codes_name_trgm" ON "icd10_codes" USING gin ("name" gin_trgm_ops)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."icd10_codes_name_trgm"`);
        await queryRunner.query(`DROP INDEX "public"."icd10_codes_code_trgm"`);
        await queryRunner.query(`CREATE INDEX "IDX_d689209e0449acea80b52a0dd6" ON "icd10_codes" USING btree ("name") `);
    }

}
