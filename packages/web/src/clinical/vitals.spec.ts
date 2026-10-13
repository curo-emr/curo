import {
  VITAL_FIELD, adultRangesApply, assessVital, collapseVitals, implausibleVitals, implausibleVitalsMessage, isPlausible, worstLevel,
} from "./index";

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

describe("implausibleVitals", () => {
  it("lists the readings no body could have, leaving out plausible and missing ones", () => {
    expect(implausibleVitals({ temperatureC: 370, pulseBpm: 72, spo2Percent: 101 })).toEqual([
      VITAL_FIELD.spo2Percent,
      VITAL_FIELD.temperatureC,
    ]);
    expect(implausibleVitals({ pulseBpm: 72 })).toEqual([]);
    expect(implausibleVitals({})).toEqual([]);
  });

  it("counts a reading that isn't a number as implausible", () => {
    expect(implausibleVitals({ weightKg: Number.NaN })).toEqual([VITAL_FIELD.weightKg]);
  });
});

describe("implausibleVitalsMessage", () => {
  it("gives the range of each implausible reading", () => {
    expect(implausibleVitalsMessage([VITAL_FIELD.temperatureC, VITAL_FIELD.pulseBpm])).toBe(
      "Temperature should be between 30 and 45 °C. Pulse should be between 20 and 250 bpm. Check the reading.",
    );
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

describe("collapseVitals", () => {
  const reading = (code: string, value: number | undefined, at: string) =>
    ({ code: { coding: [{ code }] }, valueQuantity: { value }, effectiveDateTime: at });

  it("keys readings by LOINC code, the latest one winning", () => {
    const vitals = collapseVitals([
      reading(VITAL_FIELD.pulseBpm.code, 88, "2026-10-11T09:30:00Z"),
      reading(VITAL_FIELD.pulseBpm.code, 72, "2026-10-11T09:00:00Z"),
      reading(VITAL_FIELD.temperatureC.code, 37.2, "2026-10-11T09:00:00Z"),
    ]);
    expect(vitals).toEqual({ pulseBpm: 88, temperatureC: 37.2 });
  });

  it("skips unknown codes and readings without a value", () => {
    expect(collapseVitals([
      reading("0000-0", 5, "2026-10-11T09:00:00Z"),
      reading(VITAL_FIELD.weightKg.code, undefined, "2026-10-11T09:00:00Z"),
      {},
    ])).toEqual({});
  });
});
