import { formatRelative } from "./index";

describe("formatRelative", () => {
  const now = new Date("2026-10-09T12:00:00Z").getTime();
  const ago = (ms: number) => now - ms;

  beforeEach(() => jest.useFakeTimers({ now }));
  afterEach(() => jest.useRealTimers());

  it("counts minutes, then hours, then gives the date", () => {
    expect(formatRelative(ago(20_000))).toBe("just now");
    expect(formatRelative(ago(5 * 60_000))).toBe("5 min ago");
    expect(formatRelative(ago(3 * 3_600_000))).toBe("3 h ago");
    expect(formatRelative("2026-10-01T12:00:00Z")).toBe("Oct 1, 2026");
  });
});
