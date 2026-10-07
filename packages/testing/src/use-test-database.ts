import { TEST_DB_NAME, assertTestDatabase } from './test-database';

// Runs before each spec imports its AppModule, whose decorators read DB_NAME.
// Set here, it also wins over the service's .env (ConfigModule keeps set vars).
assertTestDatabase(TEST_DB_NAME);
process.env.DB_NAME = TEST_DB_NAME;
