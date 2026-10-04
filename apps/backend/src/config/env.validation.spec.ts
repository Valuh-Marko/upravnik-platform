import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_SECRET: 'x'.repeat(32),
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'bucket',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
};

describe('validateEnv', () => {
  it('accepts a valid env and defaults CORS_ORIGIN', () => {
    expect(validateEnv(base).CORS_ORIGIN).toEqual(['http://localhost:3001']);
  });

  it('splits a comma-separated CORS_ORIGIN', () => {
    const env = validateEnv({
      ...base,
      CORS_ORIGIN: 'https://a.rs, https://b.rs',
    });
    expect(env.CORS_ORIGIN).toEqual(['https://a.rs', 'https://b.rs']);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({ ...base, DATABASE_URL: '' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rejects missing S3 settings and parses S3_FORCE_PATH_STYLE', () => {
    expect(() => validateEnv({ ...base, S3_BUCKET: '' })).toThrow(/S3_BUCKET/);
    expect(validateEnv(base).S3_FORCE_PATH_STYLE).toBe(false);
    expect(
      validateEnv({ ...base, S3_FORCE_PATH_STYLE: 'true' }).S3_FORCE_PATH_STYLE,
    ).toBe(true);
  });

  it('rejects a short or placeholder JWT_SECRET', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET/,
    );
    expect(() =>
      validateEnv({ ...base, JWT_SECRET: 'change-this-secret-in-production' }),
    ).toThrow(/placeholder/);
  });
});
