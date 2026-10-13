import { isBlankOrIcd10Code, tidyIcd10Code } from "./icd10";

describe("tidyIcd10Code", () => {
  it.each([
    ["R51.9", "R51.9"],
    [" r519 ", "R51.9"],
    ["i10", "I10"],
    ["S72001A", "S72.001A"],
    ["qa00101", "QA0.0101"],
    ["  ", ""],
  ])("reads %p as %p", (code, tidy) => {
    expect(tidyIcd10Code(code)).toBe(tidy);
  });
});

describe("isBlankOrIcd10Code", () => {
  it("takes no code, and a well-formed one however it is typed", () => {
    for (const code of ["", " ", "R51.9", "r519", "J45.909", "M1A.0", "QA0.0101"]) expect(isBlankOrIcd10Code(code)).toBe(true);
  });

  it("turns away words and malformed codes", () => {
    for (const code of ["headache", "cough", "flu", "abc", "51.9", "R5", "R51.12345"]) expect(isBlankOrIcd10Code(code)).toBe(false);
  });
});
