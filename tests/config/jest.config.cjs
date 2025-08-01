/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../../tests/unit', '<rootDir>/../../src'],
  testMatch: ['**/tests/unit/**/*.test.ts'],
  testPathIgnorePatterns: [
    'tests/unit/ConfigHandler.test.ts',
    'tests/unit/QueryExecutor.test.ts', 
    'tests/unit/database-tools.test.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        allowJs: true,
        esModuleInterop: true
      }
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!tests/**'
  ],
  coverageDirectory: '../../tests/coverage',
  testTimeout: 30000
};
