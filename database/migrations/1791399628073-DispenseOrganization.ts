import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Each dispense records the pharmacy it was made at, so a pharmacist sees only
 * their own pharmacy's. Earlier dispenses get it where it can be worked out:
 * with exactly one pharmacy, it is that one; otherwise it is the one pharmacy
 * whose stock held every batch drawn. The rest stay empty: those who look
 * across pharmacies still see them, but no pharmacist's log does.
 */
export class DispenseOrganization1791399628073 implements MigrationInterface {
    name = 'DispenseOrganization1791399628073'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medication_dispenses" ADD "organizationId" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_76c092ad178f173d84dad6c0da" ON "medication_dispenses"  ("organizationId") `);
        await queryRunner.query(`
            UPDATE "medication_dispenses"
            SET "organizationId" = (SELECT id::text FROM "organizations" WHERE type = 'pharmacy')
            WHERE (SELECT count(*) FROM "organizations" WHERE type = 'pharmacy') = 1`);
        // "batchNumber" lists the batches drawn as "B1×3, B2×2". The pharmacy is
        // the one whose stock held every batch drawn, when no other did.
        await queryRunner.query(`
            WITH drawn AS (
                SELECT d.id, d."medicationCode" AS code,
                       trim(split_part(part, '×', 1)) AS batch,
                       count(*) OVER (PARTITION BY d.id) AS batches
                FROM "medication_dispenses" d
                CROSS JOIN LATERAL unnest(string_to_array(d."batchNumber", ',')) AS part
                WHERE d."organizationId" IS NULL
            ), holders AS (
                SELECT drawn.id, s."organizationId" AS pharmacy
                FROM drawn
                JOIN "stock" s ON s."medicationCode" = drawn.code AND s."batchNumber" = drawn.batch
                WHERE s."organizationId" IS NOT NULL
                GROUP BY drawn.id, s."organizationId"
                HAVING count(DISTINCT drawn.batch) = min(drawn.batches)
            ), sole AS (
                SELECT id, min(pharmacy) AS pharmacy FROM holders GROUP BY id HAVING count(*) = 1
            )
            UPDATE "medication_dispenses" d
            SET "organizationId" = sole.pharmacy
            FROM sole
            WHERE d.id = sole.id`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_76c092ad178f173d84dad6c0da"`);
        await queryRunner.query(`ALTER TABLE "medication_dispenses" DROP COLUMN "organizationId"`);
    }

}
