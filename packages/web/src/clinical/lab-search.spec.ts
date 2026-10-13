import { matchesLabTest, type SearchableLabTest } from "./lab-search";

const fbc: SearchableLabTest = {
  code: "58410-2",
  name: "Full Blood Count",
  category: "Hematology",
  analytes: [{ display: "Hemoglobin" }, { display: "Platelets" }],
};
const lft: SearchableLabTest = { code: "24325-3", name: "Liver Function Panel", category: "Biochemistry" };
const renal: SearchableLabTest = { code: "24362-6", name: "Renal Function Panel" };
const tsh: SearchableLabTest = { code: "3016-3", name: "Thyroid Stimulating Hormone (TSH)" };

describe("matchesLabTest", () => {
  it.each([
    [fbc, "CBC"],
    [fbc, "fbc"],
    [fbc, "complete blood"],
    [lft, "LFT"],
    [renal, "u&e"],
    [renal, "kidney"],
    [tsh, "TFT"],
  ])("finds %p by the abbreviation or other name %p", (test, query) => {
    expect(matchesLabTest(test, query)).toBe(true);
  });

  it("finds a test anywhere in its name, code, category or the values it reports", () => {
    for (const query of ["blood count", "58410", "hemat", "platelet", " Full "]) expect(matchesLabTest(fbc, query)).toBe(true);
  });

  it("matches other names only from their start", () => {
    expect(matchesLabTest(lft, "ft")).toBe(false);
    expect(matchesLabTest(renal, "&e")).toBe(false);
  });

  it("turns away a test that answers to none of it", () => {
    expect(matchesLabTest(fbc, "LFT")).toBe(false);
    expect(matchesLabTest(lft, "CBC")).toBe(false);
  });

  it("takes a blank search as matching everything", () => {
    expect(matchesLabTest(lft, "  ")).toBe(true);
  });

  it("knows no other names for a test outside the list", () => {
    expect(matchesLabTest({ code: "custom-ecg", name: "ECG" }, "CBC")).toBe(false);
  });
});
