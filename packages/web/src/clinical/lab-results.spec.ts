import { isAbnormalResult, resultFlag } from "./index";

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
