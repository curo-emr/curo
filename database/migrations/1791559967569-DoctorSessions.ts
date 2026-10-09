import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Doctors' weekly sessions (DoctorSession): when each sees patients, the slot
 * length and the room. Until an administrator sets them, a doctor has none and
 * the booking form says so instead of inventing hours.
 */
export class DoctorSessions1791559967569 implements MigrationInterface {
    name = 'DoctorSessions1791559967569'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "doctor_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "practitionerId" character varying NOT NULL, "weekday" smallint NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "slotMinutes" smallint NOT NULL, "room" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_36a0c134aaf206b0c1b1e3d0ba" CHECK ("weekday" BETWEEN 0 AND 6), CONSTRAINT "CHK_6ecfa47ed261d505b064be8d5a" CHECK ("startTime" < "endTime"), CONSTRAINT "PK_154395ab9f7a80adc47c312ccc5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2cc1255ae6989af7f0b182b952" ON "doctor_sessions"  ("practitionerId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_2cc1255ae6989af7f0b182b952"`);
        await queryRunner.query(`DROP TABLE "doctor_sessions"`);
    }

}
