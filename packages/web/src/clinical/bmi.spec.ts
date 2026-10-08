import { bmiCategory, calculateBMI } from "./index";

describe("calculateBMI", () => {
  it("is weight over height squared, to one decimal", () => {
    expect(calculateBMI(170, 65)).toBe(22.5);
    expect(calculateBMI(180, 100)).toBe(30.9);
  });

  it("is null without both measurements", () => {
    expect(calculateBMI(undefined, 65)).toBeNull();
    expect(calculateBMI(170, null)).toBeNull();
    expect(calculateBMI(0, 65)).toBeNull();
  });
});

describe("bmiCategory", () => {
  it.each([
    [16, "underweight"],
    [18.4, "underweight"],
    [18.5, "healthy"],
    [24.9, "healthy"],
    [25, "overweight"],
    [29.9, "overweight"],
    [30, "obese"],
  ] as const)("puts %d in %s", (bmi, category) => {
    expect(bmiCategory(bmi)).toBe(category);
  });
});
