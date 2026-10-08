import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The fields the registration and edit forms always asked for but had nowhere
 * to go: nationality, occupation, tags, and the insurance expiry date, policy
 * holder and the patient's relationship to them.
 */
export class PatientFormFields1791496450915 implements MigrationInterface {
    name = 'PatientFormFields1791496450915'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patients" ADD "nationality" character varying`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "occupation" character varying`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "tags" text array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "insuranceExpiryDate" date`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "insuranceHolderName" character varying`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "insuranceRelationship" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "insuranceRelationship"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "insuranceHolderName"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "insuranceExpiryDate"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "tags"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "occupation"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "nationality"`);
    }

}
