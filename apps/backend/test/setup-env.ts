import { testDatabaseUrl } from './test-env';

// Runs before each test file, before AppModule is imported.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.JWT_SECRET = 'e2e-test-secret-that-is-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://localhost:3001';
// Storage is replaced by an in-memory fake in the e2e app; these only satisfy env validation.
process.env.S3_REGION = 'us-east-1';
process.env.S3_BUCKET = 'e2e-test-bucket';
process.env.S3_ACCESS_KEY_ID = 'e2e';
process.env.S3_SECRET_ACCESS_KEY = 'e2e';
