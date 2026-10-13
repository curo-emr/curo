import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { Icd10Code } from '../src/entities/icd10-code.entity';

const REPO_ROOT = join(__dirname, '../../..');
/** Lines of CMS's FY2027 release, with its CRLF line endings. */
const SAMPLE = join(REPO_ROOT, 'database/fixtures/icd10cm-codes.sample.txt');
const SAMPLE_CODES = [
  'A00.0',
  'G44.209',
  'G44.219',
  'G44.81',
  'G44.86',
  'I10',
  'M1A.00X0',
  'QA0.0101',
  'R05.9',
  'R51.9',
  'S72.001A',
];

/** Runs the import of `file` the way deploys do, into the test database; returns what it logged. */
const importRelease = (file: string) =>
  execFileSync('npm', ['run', '--silent', 'icd10:import', '--', file], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

/** A release file of `lines`, for one test. */
function releaseOf(lines: string[]) {
  const file = join(mkdtempSync(join(tmpdir(), 'icd10cm-')), 'codes.txt');
  writeFileSync(file, lines.join('\r\n'));
  return file;
}

describe('the ICD-10-CM diagnosis list', () => {
  let svc: ServiceUnderTest;
  let doctor: TestActor;

  beforeAll(async () => {
    svc = await startService(AppModule);
    doctor = await svc.as(UserRole.DOCTOR);
    importRelease(SAMPLE);
  });

  afterAll(() => svc.close());

  const listed = async () =>
    (
      await svc.db.getRepository(Icd10Code).find({ order: { code: 'ASC' } })
    ).map((c) => [c.code, c.name]);

  describe('import', () => {
    it('lists every code in the release, dotted as doctors write them', async () => {
      const codes = await listed();

      expect(codes.map(([code]) => code)).toEqual(SAMPLE_CODES);
      expect(codes).toContainEqual(['R51.9', 'Headache, unspecified']);
    });

    it('changes nothing when run again', () => {
      expect(importRelease(SAMPLE)).toContain(
        `${SAMPLE_CODES.length} codes (0 added or renamed, 0 removed)`,
      );
    });

    it("adds a new release's codes, renames changed ones and removes retired ones", async () => {
      const [, ...kept] = readFileSync(SAMPLE, 'utf8')
        .split('\r\n')
        .filter((line) => !line.startsWith('R519'));
      const release = releaseOf([
        ...kept,
        'R519    Headache, not otherwise specified',
        'R5182   Headache, new code',
      ]);

      expect(importRelease(release)).toContain(
        '(2 added or renamed, 1 removed)',
      );
      const codes = await listed();
      expect(codes).not.toContainEqual(['A00.0', expect.anything()]);
      expect(codes).toContainEqual([
        'R51.9',
        'Headache, not otherwise specified',
      ]);
      expect(codes).toContainEqual(['R51.82', 'Headache, new code']);

      importRelease(SAMPLE);
    });

    it('stops at a line that is not a code and its name, leaving the list as it was', async () => {
      const before = await listed();

      for (const release of [
        releaseOf(['R519    Headache, unspecified', 'Headache without a code']),
        releaseOf(['']),
      ])
        expect(() => importRelease(release)).toThrow();

      expect(await listed()).toEqual(before);
    });
  });

  describe('GET /icd10', () => {
    const search = async (term: string) => {
      const res = await svc.api
        .get('/icd10')
        .query({ search: term })
        .set(doctor.headers)
        .expect(200);
      const bundle = res.body as { entry: { resource: Icd10Code }[] };
      return bundle.entry.map((e) => e.resource.code);
    };

    it('leads with the broadest diagnosis named by the search', async () => {
      expect(await search('headache')).toEqual([
        'R51.9', // Headache, unspecified
        'G44.81', // Hypnic headache
        'G44.86', // Cervicogenic headache
        'G44.219', // Episodic tension-type headache, not intractable
        'G44.209', // Tension-type headache, unspecified, not intractable
      ]);
    });

    it('finds names with every word searched for, wherever they are', async () => {
      expect(await search('tension headache')).toEqual(['G44.219', 'G44.209']);
      expect(await search('headache tension intractable')).toEqual([
        'G44.219',
        'G44.209',
      ]);
    });

    it('finds codes by their start, whatever their case', async () => {
      expect(await search('g44.2')).toEqual(['G44.219', 'G44.209']);
      expect(await search('qa0')).toEqual(['QA0.0101']);
    });

    it('reads % and _ as themselves', async () => {
      expect(await search('%')).toEqual([]);
      expect(await search('_')).toEqual([]);
    });

    it('lists every code, in code order, without a search', async () => {
      const res = await svc.api.get('/icd10').set(doctor.headers).expect(200);

      const bundle = res.body as { entry: { resource: Icd10Code }[] };
      expect(bundle.entry.map((e) => e.resource.code)).toEqual(SAMPLE_CODES);
    });
  });
});
