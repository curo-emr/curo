import { slotIsOver, slotsOn, startOf, weekdayOf, workingDays, type DoctorSession } from "./index";

const session = (weekday: number, start: string, end: string, slotMinutes: number, room: string | null = null): DoctorSession => ({
  practitionerId: "dr",
  weekday,
  start,
  end,
  slotMinutes,
  room,
});

describe("weekdayOf", () => {
  it("reads the date as a calendar date", () => {
    expect(weekdayOf("2026-10-12")).toBe(1); // a Monday
    expect(weekdayOf("2026-10-11")).toBe(0);
  });
});

describe("slotsOn", () => {
  const week = [session(1, "16:00", "17:00", 20, "3"), session(1, "09:00", "10:00", 25), session(2, "09:00", "12:00", 15)];

  it("cuts the day's sessions into slots, earliest first, leaving out one that would overrun", () => {
    expect(slotsOn(week, "2026-10-12")).toEqual([
      { time: "09:00", minutes: 25, room: null },
      { time: "09:25", minutes: 25, room: null },
      { time: "16:00", minutes: 20, room: "3" },
      { time: "16:20", minutes: 20, room: "3" },
      { time: "16:40", minutes: 20, room: "3" },
    ]);
  });

  it("offers nothing on a day without a session", () => {
    expect(slotsOn(week, "2026-10-14")).toEqual([]);
  });
});

describe("workingDays", () => {
  it("names each working day once, Monday first", () => {
    expect(workingDays([session(0, "09:00", "12:00", 15), session(3, "09:00", "12:00", 15), session(3, "16:00", "18:00", 15)])).toBe(
      "Wed, Sun",
    );
    expect(workingDays([])).toBe("");
  });
});

describe("startOf", () => {
  it("reads the date and time on the local clock", () => {
    expect(startOf("2026-10-12", "09:30")).toEqual(new Date(2026, 9, 12, 9, 30));
  });
});

describe("slotIsOver", () => {
  const slot = { time: "09:00", minutes: 15, room: null };
  const at = (hour: number, minute: number, day = 12) => new Date(2026, 9, day, hour, minute);

  it("keeps a slot bookable until it ends, then not", () => {
    expect(slotIsOver(slot, "2026-10-12", at(8, 59))).toBe(false);
    expect(slotIsOver(slot, "2026-10-12", at(9, 10))).toBe(false);
    expect(slotIsOver(slot, "2026-10-12", at(9, 15))).toBe(true);
  });

  it("is over on an earlier day, and not yet on a later one", () => {
    expect(slotIsOver(slot, "2026-10-11", at(8, 0))).toBe(true);
    expect(slotIsOver(slot, "2026-10-13", at(23, 0))).toBe(false);
  });
});
