import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_SECRET: 'x'.repeat(32),
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

  it('rejects a short or placeholder JWT_SECRET', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET/,
    );
    expect(() =>
      validateEnv({ ...base, JWT_SECRET: 'change-this-secret-in-production' }),
    ).toThrow(/placeholder/);
  });
});
