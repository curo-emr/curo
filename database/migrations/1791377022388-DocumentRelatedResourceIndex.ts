import { MigrationInterface, QueryRunner } from "typeorm";

/** A lab order's report files are looked up by the order they belong to. */
export class DocumentRelatedResourceIndex1791377022388 implements MigrationInterface {
    name = 'DocumentRelatedResourceIndex1791377022388'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_7a1f37d928574e6321cfcd6bb4" ON "document_references"  ("relatedResourceId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_7a1f37d928574e6321cfcd6bb4"`);
    }

}
