import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Connection options for the shared Postgres database, read from DB_* env vars.
 * Each service passes only the entities it maps.
 *
 * Services never change the schema: migrations in database/migrations do
 * (`npm run db:migrate`, or the curo-migrate container in Docker).
 */
export function databaseOptions(entities: TypeOrmModuleOptions['entities']): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'curo',
    password: process.env.DB_PASS || 'curo_secret',
    database: process.env.DB_NAME || 'curo_db',
    entities,
    synchronize: false,
  };
}
