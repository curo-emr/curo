import { MigrationInterface, QueryRunner } from "typeorm";

/** A pharmacy can put a prescription on hold, and says why. */
export class PrescriptionHold1791648355754 implements MigrationInterface {
    name = 'PrescriptionHold1791648355754'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medication_requests" ADD "statusReason" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medication_requests" DROP COLUMN "statusReason"`);
    }

}
