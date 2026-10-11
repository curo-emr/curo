import { frequencyLabel } from "./dosing";

describe("frequencyLabel", () => {
  it.each([
    ["BID", "Twice a day"],
    ["bd", "Twice a day"],
    ["TDS", "Three times a day"],
    ["QN", "At night"],
    ["Q6H PRN", "Every 6 hours, when needed"],
    ["q1h", "Every hour"],
  ])("reads %s as %s", (code, words) => {
    expect(frequencyLabel(code)).toBe(words);
  });

  it("shows what isn't shorthand as written", () => {
    expect(frequencyLabel("After breakfast")).toBe("After breakfast");
    expect(frequencyLabel("BID with food")).toBe("BID with food");
  });

  it("is empty for no frequency", () => {
    expect(frequencyLabel(undefined)).toBe("");
    expect(frequencyLabel("  ")).toBe("");
  });
});
