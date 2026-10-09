import { calculateAge, formatAgeSex } from "./index";

describe("calculateAge", () => {
  const on = new Date(2026, 9, 9); // 9 October 2026, local time

  it("counts a year on the birthday itself, not the day before", () => {
    expect(calculateAge("2008-10-09", on)).toBe(18);
    expect(calculateAge("2008-10-10", on)).toBe(17);
  });

  it("reads only the date part of a timestamp", () => {
    expect(calculateAge("1990-01-31T00:00:00Z", on)).toBe(36);
  });

  it("is null without a usable date", () => {
    expect(calculateAge("", on)).toBeNull();
    expect(calculateAge(null, on)).toBeNull();
    expect(calculateAge("not a date", on)).toBeNull();
  });
});

describe("formatAgeSex", () => {
  it("joins what is known", () => {
    expect(formatAgeSex("", "female")).toBe("Female");
    expect(formatAgeSex(null, null)).toBe("");
    expect(formatAgeSex("2000-01-01", "male")).toMatch(/^\d+y · Male$/);
  });
});
