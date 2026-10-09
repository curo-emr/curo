import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * A doctor can't have two live appointments at overlapping times (see the
 * Appointment entity). btree_gist lets the constraint compare the doctor's id
 * with `=` alongside the time-range overlap.
 */
export class AppointmentNoDoubleBooking1791559441000 implements MigrationInterface {
    name = 'AppointmentNoDoubleBooking1791559441000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_double_booking" EXCLUDE USING gist ("practitionerId" WITH =, tsrange("start", "end") WITH &&) WHERE (status NOT IN ('cancelled', 'noshow', 'waitlist'))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "appointments_no_double_booking"`);
    }

}
