/** @type {import('jest').Config} */
module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/../test/integration-env.ts'],
  globalSetup: '<rootDir>/../test/integration-setup.ts',
};
