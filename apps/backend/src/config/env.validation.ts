// Validates process.env at startup (ConfigModule.forRoot({ validate })).
// The app refuses to start with a missing or weak JWT secret.
const PLACEHOLDER_SECRET = 'change-this-secret-in-production';

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  // Comma-separated list of allowed browser origins (HTTP and WebSocket).
  CORS_ORIGIN: string[];
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const errors: string[] = [];

  const databaseUrl = raw.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || !databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  const secret = raw.JWT_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) {
    errors.push('JWT_SECRET is required and must be at least 32 characters');
  } else if (secret === PLACEHOLDER_SECRET) {
    errors.push('JWT_SECRET must not be the .env.example placeholder');
  }

  const corsOrigin =
    typeof raw.CORS_ORIGIN === 'string' && raw.CORS_ORIGIN
      ? raw.CORS_ORIGIN
      : 'http://localhost:3001';

  if (errors.length > 0) {
    throw new Error(`Invalid environment:\n- ${errors.join('\n- ')}`);
  }

  return {
    ...raw,
    DATABASE_URL: databaseUrl as string,
    JWT_SECRET: secret as string,
    CORS_ORIGIN: corsOrigin.split(',').map((o) => o.trim()),
  };
}
