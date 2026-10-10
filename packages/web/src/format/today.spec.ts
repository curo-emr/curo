import { getTodayString } from "./index";

describe("getTodayString", () => {
  it("is the local calendar day, zero-padded", () => {
    expect(getTodayString(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(getTodayString(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });
});
