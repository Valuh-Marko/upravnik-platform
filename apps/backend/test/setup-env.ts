import { testDatabaseUrl } from './test-env';

// Runs before each test file, before AppModule is imported.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.JWT_SECRET = 'e2e-test-secret-that-is-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://localhost:3001';
