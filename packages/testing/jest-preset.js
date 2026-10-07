// Jest preset for a service's API tests (test/*.e2e-spec.ts). Each spec boots
// the service's AppModule against a test database that globalSetup recreates
// from the migrations, so the tests see the real schema and transactions.
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  globalSetup: require.resolve('./src/global-setup.ts'),
  setupFiles: [require.resolve('./src/use-test-database.ts')],
  // Spec files share the one database.
  maxWorkers: 1,
};
