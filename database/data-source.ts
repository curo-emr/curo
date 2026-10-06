import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';

const root = join(__dirname, '..');

/** Connection to the shared database from DB_* env vars, same defaults as the services. */
export const connectionOptions: Extract<DataSourceOptions, { type: 'postgres' }> = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'curo',
  password: process.env.DB_PASS || 'curo_secret',
  database: process.env.DB_NAME || 'curo_db',
};

/**
 * DataSource for the TypeORM migration CLI (`npm run db:*`). Services connect
 * through `databaseOptions()` in @curo/shared and never change the schema.
 */
export default new DataSource({
  ...connectionOptions,
  // Entities are only read when generating or checking migrations, which needs
  // the repo checkout (and a built @curo/shared). The migrate/seed image ships
  // without them, so these globs match nothing there.
  // Shared entities come from dist because that is what services import.
  entities: [
    join(root, 'packages/shared/dist/database/entities/*.entity.js'),
    join(root, 'services/*/src/entities/*.entity.ts'),
  ],
  migrations: [join(__dirname, 'migrations/*.ts')],
  synchronize: false,
});
