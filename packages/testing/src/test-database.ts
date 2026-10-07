/**
 * The database the API tests run against, recreated on every run. Its name
 * must end in `_test`, so a stray setting can never point them at real data.
 */
export const TEST_DB_NAME = process.env.TEST_DB_NAME ?? 'curo_test';

export function assertTestDatabase(name: unknown): void {
  if (typeof name !== 'string' || !name.endsWith('_test'))
    throw new Error(
      `Refusing to run API tests against database "${String(name)}": its name must end in _test`,
    );
}
