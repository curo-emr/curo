import { generatePassword } from "./password";

describe("generatePassword", () => {
  it("is three groups of four readable characters", () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePassword()).toMatch(/^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$/);
    }
  });

  it("is different every time", () => {
    const passwords = new Set(Array.from({ length: 100 }, generatePassword));
    expect(passwords.size).toBe(100);
  });
});
