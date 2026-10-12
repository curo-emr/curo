import { formatDate, formatDateTime, formatDay, formatTime, minutesSince } from "./index";

// Instants are built from local dates, so these pass in any time zone.
const local = (...parts: [number, number, number, number?, number?]) => new Date(...parts).toISOString();

describe("formatDate", () => {
  it("reads a calendar date as that day", () => {
    expect(formatDate("2026-10-07")).toBe("Oct 7, 2026");
  });

  it("formats an instant on the local calendar", () => {
    expect(formatDate(local(2026, 0, 5, 23, 59))).toBe("Jan 5, 2026");
    expect(formatDate(new Date(2026, 11, 31))).toBe("Dec 31, 2026");
  });

  it("is empty for none", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate(null)).toBe("");
  });
});

describe("formatDay", () => {
  it("names the weekday, month and day", () => {
    expect(formatDay(new Date(2026, 9, 12, 23, 59))).toBe("Monday, October 12");
    expect(formatDay(local(2026, 9, 7, 0, 30))).toBe("Wednesday, October 7");
  });

  it("reads a calendar date as that day", () => {
    expect(formatDay("2026-10-07")).toBe("Wednesday, October 7");
  });

  it("is today by default", () => {
    expect(formatDay()).toBe(formatDay(new Date()));
  });
});

describe("formatTime", () => {
  it("formats a clock time", () => {
    expect(formatTime("14:30")).toBe("2:30 PM");
    expect(formatTime("00:05")).toBe("12:05 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("09:15:00")).toBe("9:15 AM");
    expect(formatTime("19")).toBe("7:00 PM");
  });

  it("formats an instant on the local clock", () => {
    expect(formatTime(local(2026, 9, 12, 14, 30))).toBe("2:30 PM");
  });

  it("is empty for none and leaves anything unreadable as it came", () => {
    expect(formatTime("")).toBe("");
    expect(formatTime(undefined)).toBe("");
    expect(formatTime("soon")).toBe("soon");
  });
});

describe("formatDateTime", () => {
  it("joins the date and the time", () => {
    expect(formatDateTime(local(2026, 9, 12, 9, 5))).toBe("Oct 12, 2026, 9:05 AM");
  });

  it("is empty for none", () => {
    expect(formatDateTime(null)).toBe("");
  });
});

describe("minutesSince", () => {
  it("counts whole minutes until now", () => {
    expect(minutesSince(new Date(Date.now() - 5 * 60_000).toISOString())).toBe(5);
  });

  it("is 0 for none or a time still to come", () => {
    expect(minutesSince(null)).toBe(0);
    expect(minutesSince(new Date(Date.now() + 60 * 60_000).toISOString())).toBe(0);
  });
});
