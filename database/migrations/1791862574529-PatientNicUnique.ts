import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * No two patients share a NIC. NICs are first put in the form the API now
 * stores (trimmed, in capitals, blank as none), so the index compares like with
 * like. Fails if two patients already share one: resolve those records first.
 */
export class PatientNicUnique1791862574529 implements MigrationInterface {
    name = 'PatientNicUnique1791862574529'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "patients" SET "nic" = NULLIF(UPPER(TRIM("nic")), '') WHERE "nic" IS DISTINCT FROM NULLIF(UPPER(TRIM("nic")), '')`);
        await queryRunner.query(`CREATE UNIQUE INDEX "patients_nic_unique" ON "patients"  ("nic") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."patients_nic_unique"`);
    }

}
