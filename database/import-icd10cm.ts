import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { connectionOptions } from './data-source';
// Imported from source: this image is built without the workspaces.
import { ICD10_CODE, tidyIcd10Code } from '../packages/shared/src/icd10';

// Fills the diagnosis list (icd10_codes) from CMS's yearly ICD-10-CM release:
// its code descriptions file, one billable code a line ("R519    Headache,
// unspecified"). database/Dockerfile downloads the release, checked against a
// pinned hash, into the image.
//
// The list becomes exactly the release: new codes are added, renamed ones
// updated and retired ones removed (a recorded diagnosis keeps its own code
// and wording). Run again, it changes nothing, so it can run on every deploy.

/** Where database/Dockerfile puts the release. Another file can be named on the command line. */
const RELEASE_FILE = join(__dirname, 'data/icd10cm-codes.txt');

export interface Icd10Entry {
  code: string;
  name: string;
}

const LINE = /^(\S+) +(\S.*)$/;

/**
 * The codes in a release file, dotted as doctors write them. A line that isn't
 * a code and its name stops the import, so a damaged file can't empty the list.
 */
export function parseIcd10cmCodes(text: string): Icd10Entry[] {
  const entries = text.split('\n').flatMap((line, i) => {
    if (!line.trim()) return [];
    const [, written = '', name = ''] = LINE.exec(line.trimEnd()) ?? [];
    const code = tidyIcd10Code(written);
    if (!ICD10_CODE.test(code))
      throw new Error(`Line ${i + 1} isn't an ICD-10-CM code and its name`);
    return [{ code, name }];
  });
  if (!entries.length) throw new Error('The release file holds no codes');
  return entries;
}

/** Makes icd10_codes hold exactly `entries`, in one transaction. */
export function importIcd10cm(
  db: DataSource,
  entries: Icd10Entry[],
): Promise<{ changed: number; removed: number }> {
  const codes = entries.map((e) => e.code);
  const names = entries.map((e) => e.name);
  return db.transaction(async (em) => {
    // Each array goes as one parameter, however long the release.
    const [{ changed }] = await em.query<{ changed: number }[]>(
      `WITH changed AS (
         INSERT INTO icd10_codes (code, name)
         SELECT * FROM unnest($1::text[], $2::text[])
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
           WHERE icd10_codes.name IS DISTINCT FROM EXCLUDED.name
         RETURNING 1
       ) SELECT count(*)::int AS changed FROM changed`,
      [codes, names],
    );
    const [{ removed }] = await em.query<{ removed: number }[]>(
      `WITH removed AS (
         DELETE FROM icd10_codes c
         WHERE NOT EXISTS (
           SELECT 1 FROM unnest($1::text[]) AS release(code)
           WHERE release.code = c.code
         )
         RETURNING 1
       ) SELECT count(*)::int AS removed FROM removed`,
      [codes],
    );
    return { changed, removed };
  });
}

async function main() {
  const entries = parseIcd10cmCodes(
    readFileSync(process.argv[2] ?? RELEASE_FILE, 'utf8'),
  );
  const db = await new DataSource(connectionOptions).initialize();
  try {
    const { changed, removed } = await importIcd10cm(db, entries);
    console.log(
      `✅ ICD-10-CM: ${entries.length} codes (${changed} added or renamed, ${removed} removed)`,
    );
  } finally {
    await db.destroy();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('ICD-10-CM import failed:', e);
    process.exit(1);
  });
}
