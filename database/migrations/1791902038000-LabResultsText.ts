import { MigrationInterface, QueryRunner } from "typeorm";

/** A lab can file its results as pasted text, in place of typed values or alongside them. */
export class LabResultsText1791902038000 implements MigrationInterface {
    name = 'LabResultsText1791902038000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "diagnostic_reports" ADD "resultsText" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "diagnostic_reports" DROP COLUMN "resultsText"`);
    }

}
