# Tests Directory

This directory contains all test infrastructure and test files for the dj-postgres-mcp project.

## Structure

```
tests/
├── README.md                    # This file
├── TESTING.md                   # Comprehensive testing guide
├── config/                      # Test configurations
│   ├── jest.config.cjs         # Jest unit test configuration
│   └── docker-compose.test.yml # Docker PostgreSQL test container
├── unit/                       # Unit tests (Jest)
│   ├── setup.ts               # Jest test setup
│   ├── smoke.test.ts          # Basic smoke tests
│   └── unit/                  # Organized unit tests
│       ├── ConfigHandler.test.ts
│       ├── database-tools.test.ts
│       ├── errors.test.ts
│       └── QueryExecutor.test.ts
├── integration/                # Integration tests
│   └── run-integration-tests.js # Main integration test runner
├── fixtures/                   # Test data and fixtures
└── coverage/                   # Test coverage reports (generated)
```

## Running Tests

### Quick Commands
```bash
# Run all tests (integration tests by default)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Docker Setup
```bash
# Start PostgreSQL test database
npm run test:docker:up

# Stop PostgreSQL test database  
npm run test:docker:down

# Setup test environment (includes Docker start)
npm run test:setup
```

## Test Types

### Unit Tests (Jest)
- Located in `tests/unit/`
- Configuration: `tests/config/jest.config.cjs`
- Tests individual components and functions
- Mock dependencies where appropriate
- Fast execution, no external dependencies

### Integration Tests (Custom Runner)
- Located in `tests/integration/`
- Main runner: `run-integration-tests.js`
- Tests against real PostgreSQL database in Docker
- Comprehensive end-to-end testing of MCP protocol
- Tests all database operations and tools

### Configuration Files
- `tests/config/jest.config.cjs` - Jest configuration for unit tests
- `tests/config/docker-compose.test.yml` - PostgreSQL test container setup

## Coverage Reports
- Generated in `tests/coverage/` directory
- Excludes test files and build artifacts
- Focuses on `src/` directory coverage

## Development Workflow

1. **Write unit tests** for new components in `tests/unit/`
2. **Run unit tests** during development: `npm run test:unit`
3. **Run integration tests** before commits: `npm run test:integration`
4. **Check coverage** periodically: `npm run test:coverage`

## CI/CD Integration

The test suite is designed for CI/CD pipelines:
- `npm run test:ci` - Complete CI test workflow
- Uses Docker for consistent database environment
- Comprehensive integration testing ensures production readiness

## Philosophy

This project prioritizes **real database testing** over mocking:
- Integration tests use actual PostgreSQL instances
- Unit tests focus on business logic and error handling
- All database operations are tested against real PostgreSQL behavior
