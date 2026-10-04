// Validates process.env at startup (ConfigModule.forRoot({ validate })).
// The app refuses to start with a missing or weak JWT secret.
const PLACEHOLDER_SECRET = 'change-this-secret-in-production';

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  // Comma-separated list of allowed browser origins (HTTP and WebSocket).
  CORS_ORIGIN: string[];
  // S3-compatible file storage. S3_ENDPOINT is unset for AWS S3.
  S3_ENDPOINT?: string;
  S3_REGION: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_FORCE_PATH_STYLE: boolean;
}

const REQUIRED_S3_VARS = [
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
] as const;

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

  for (const name of REQUIRED_S3_VARS) {
    if (typeof raw[name] !== 'string' || !raw[name]) {
      errors.push(`${name} is required`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment:\n- ${errors.join('\n- ')}`);
  }

  return {
    ...raw,
    DATABASE_URL: databaseUrl as string,
    JWT_SECRET: secret as string,
    CORS_ORIGIN: corsOrigin.split(',').map((o) => o.trim()),
    S3_ENDPOINT: (raw.S3_ENDPOINT as string | undefined) || undefined,
    S3_REGION: raw.S3_REGION as string,
    S3_BUCKET: raw.S3_BUCKET as string,
    S3_ACCESS_KEY_ID: raw.S3_ACCESS_KEY_ID as string,
    S3_SECRET_ACCESS_KEY: raw.S3_SECRET_ACCESS_KEY as string,
    S3_FORCE_PATH_STYLE: raw.S3_FORCE_PATH_STYLE === 'true',
  };
}
