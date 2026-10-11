import { analytesToReport, formatRange, isAbnormalResult, referenceRangeFor, resultFlag, type LabAnalyte } from "./index";

describe("resultFlag", () => {
  it("reads the FHIR interpretation codes", () => {
    expect(resultFlag("N")).toBe("normal");
    expect(resultFlag("L")).toBe("low");
    expect(resultFlag("H")).toBe("high");
    expect(resultFlag("A")).toBe("abnormal");
  });

  it("reads the doubled codes as critical", () => {
    expect(resultFlag("LL")).toBe("critical");
    expect(resultFlag("HH")).toBe("critical");
    expect(resultFlag("AA")).toBe("critical");
  });

  it("ignores case and spaces, and is undefined for no code or an unknown one", () => {
    expect(resultFlag(" h ")).toBe("high");
    expect(resultFlag(undefined)).toBeUndefined();
    expect(resultFlag("")).toBeUndefined();
    expect(resultFlag("POS")).toBeUndefined();
  });
});

describe("isAbnormalResult", () => {
  it("is every flag but normal, and not a result with no flag", () => {
    expect(isAbnormalResult("high")).toBe(true);
    expect(isAbnormalResult("critical")).toBe(true);
    expect(isAbnormalResult("normal")).toBe(false);
    expect(isAbnormalResult(undefined)).toBe(false);
  });
});

describe("referenceRangeFor", () => {
  const on = new Date(2026, 9, 11);
  const adult = "1990-01-01";
  const hemoglobin: LabAnalyte = {
    code: "718-7", display: "Hemoglobin", unit: "g/dL", low: 12, high: 17.5,
    male: { low: 13.5, high: 17.5 }, female: { low: 12, high: 15.5 },
  };

  it("uses the patient's sex's range where the catalog has one", () => {
    expect(referenceRangeFor(hemoglobin, { sex: "male", dob: adult }, on)).toEqual({ low: 13.5, high: 17.5 });
    expect(referenceRangeFor(hemoglobin, { sex: "female", dob: adult }, on)).toEqual({ low: 12, high: 15.5 });
  });

  it("falls back to the general range for any other sex, or none per sex", () => {
    expect(referenceRangeFor(hemoglobin, { sex: "other", dob: adult }, on)).toEqual({ low: 12, high: 17.5 });
    const glucose: LabAnalyte = { code: "2345-7", display: "Glucose", unit: "mg/dL", low: 70, high: 100 };
    expect(referenceRangeFor(glucose, { sex: "female", dob: adult }, on)).toEqual({ low: 70, high: 100 });
  });

  it("is null for a child, an unknown date of birth, or an analyte without a range", () => {
    expect(referenceRangeFor(hemoglobin, { sex: "male", dob: "2015-05-01" }, on)).toBeNull();
    expect(referenceRangeFor(hemoglobin, { sex: "male", dob: null }, on)).toBeNull();
    expect(referenceRangeFor({ code: "x", display: "X", unit: "" }, { sex: "male", dob: adult }, on)).toBeNull();
  });
});

describe("formatRange", () => {
  it("joins the known ends", () => {
    expect(formatRange(12, 17.5)).toBe("12 - 17.5");
    expect(formatRange("0.4", "")).toBe("0.4");
    expect(formatRange(null, undefined)).toBe("");
  });
});

describe("analytesToReport", () => {
  const fbc = { code: "58410-2", name: "Full Blood Count" };
  const tsh = { code: "3016-3", name: "TSH" };
  const hb: LabAnalyte = { code: "718-7", display: "Hemoglobin", unit: "g/dL", low: 12, high: 16 };
  const plt: LabAnalyte = { code: "777-3", display: "Platelets", unit: "10^3/µL", low: 150, high: 400 };

  it("expands each ordered test into its catalog analytes, in order", () => {
    expect(analytesToReport([fbc], [{ code: fbc.code, analytes: [hb, plt] }])).toEqual([
      { test: fbc, analyte: hb },
      { test: fbc, analyte: plt },
    ]);
  });

  it("makes a test the catalog has no analytes for one value of its own", () => {
    const own = { code: tsh.code, display: tsh.name, unit: "" };
    expect(analytesToReport([tsh], [])).toEqual([{ test: tsh, analyte: own }]);
    expect(analytesToReport([tsh], [{ code: tsh.code, analytes: [] }])).toEqual([{ test: tsh, analyte: own }]);
  });
});
