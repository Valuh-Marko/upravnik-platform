import { execSync } from 'child_process';
import { Client } from 'pg';
import { testDatabaseUrl } from './test-env';

// Creates the test database if needed and applies all migrations.
export default async function globalSetup() {
  const url = new URL(testDatabaseUrl());
  const dbName = url.pathname.slice(1);

  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  );
  if (!rowCount) await client.query(`CREATE DATABASE "${dbName}"`);
  await client.end();

  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/..`,
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'ignore',
  });
}
