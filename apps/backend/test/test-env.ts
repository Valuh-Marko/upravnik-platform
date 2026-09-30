import 'dotenv/config';

// e2e tests run against a separate database: TEST_DATABASE_URL, or the dev
// DATABASE_URL with the database name suffixed with `_test`.
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
}
