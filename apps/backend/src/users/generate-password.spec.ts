import { generatePassword } from './users.service';

describe('generatePassword', () => {
  it('returns 12 characters from the unambiguous alphabet', () => {
    for (let i = 0; i < 100; i++) {
      expect(generatePassword()).toMatch(/^[A-HJKMNP-Z2-9]{12}$/);
    }
  });

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 1000 }, generatePassword));
    expect(seen.size).toBe(1000);
  });
});
