import { MigrationInterface, QueryRunner } from "typeorm";

/** A password reset ends the sessions signed in before it. */
export class SessionsEndedAt1791716111000 implements MigrationInterface {
    name = 'SessionsEndedAt1791716111000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "sessionsEndedAt" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "sessionsEndedAt"`);
    }

}
