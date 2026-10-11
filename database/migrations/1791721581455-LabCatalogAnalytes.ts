import { MigrationInterface, QueryRunner } from "typeorm";

/** What each catalog test reports: per analyte, its unit and reference range. The seed fills it in. */
export class LabCatalogAnalytes1791721581455 implements MigrationInterface {
    name = 'LabCatalogAnalytes1791721581455'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lab_test_catalog" ADD "analytes" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lab_test_catalog" DROP COLUMN "analytes"`);
    }

}
