import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * A diagnosis can be recorded in words alone, without an ICD-10 code. Reverting
 * fails once one has been: give those a code (or remove them) first.
 */
export class ConditionCodeOptional1791875114620 implements MigrationInterface {
    name = 'ConditionCodeOptional1791875114620'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conditions" ALTER COLUMN "code" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conditions" ALTER COLUMN "code" SET NOT NULL`);
    }

}
