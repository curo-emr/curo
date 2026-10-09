import { VITAL_FIELD, adultRangesApply, assessVital, isPlausible, worstLevel } from "./index";

describe("assessVital", () => {
  it("is normal inside the reference band, edges included", () => {
    expect(assessVital(VITAL_FIELD.bpSystolic, 129)?.level).toBe("normal");
    expect(assessVital(VITAL_FIELD.pulseBpm, 60)?.level).toBe("normal");
  });

  it("flags readings outside the band, and critical ones outside the alert band", () => {
    expect(assessVital(VITAL_FIELD.bpSystolic, 152)).toEqual({ level: "alert", label: "High" });
    expect(assessVital(VITAL_FIELD.spo2Percent, 93)).toEqual({ level: "alert", label: "Low" });
    expect(assessVital(VITAL_FIELD.temperatureC, 39.8)).toEqual({ level: "critical", label: "Very high" });
  });

  it("is null without a reading, or for a field with no ranges", () => {
    expect(assessVital(VITAL_FIELD.pulseBpm, undefined)).toBeNull();
    expect(assessVital(VITAL_FIELD.heightCm, 170)).toBeNull();
  });
});

describe("worstLevel", () => {
  it("is the most worrying of several assessments", () => {
    const high = assessVital(VITAL_FIELD.bpSystolic, 190);
    const fine = assessVital(VITAL_FIELD.bpDiastolic, 70);
    expect(worstLevel([fine, high])).toBe("critical");
    expect(worstLevel([null, fine])).toBe("normal");
    expect(worstLevel([null])).toBeNull();
  });
});

describe("isPlausible", () => {
  it("rejects typos far outside what a body can read", () => {
    expect(isPlausible(VITAL_FIELD.temperatureC, 37)).toBe(true);
    expect(isPlausible(VITAL_FIELD.temperatureC, 370)).toBe(false);
  });
});

describe("adultRangesApply", () => {
  const today = new Date(2026, 9, 9); // 9 October 2026

  it("applies from the eighteenth birthday", () => {
    expect(adultRangesApply("2008-10-09", today)).toBe(true);
    expect(adultRangesApply("1972-03-14", today)).toBe(true);
  });

  it("doesn't apply to children, even the day before they turn eighteen", () => {
    expect(adultRangesApply("2008-10-10", today)).toBe(false);
    expect(adultRangesApply("2019-06-01", today)).toBe(false);
  });

  it("doesn't apply without a usable date of birth", () => {
    expect(adultRangesApply(undefined, today)).toBe(false);
    expect(adultRangesApply("", today)).toBe(false);
    expect(adultRangesApply("unknown", today)).toBe(false);
  });
});
