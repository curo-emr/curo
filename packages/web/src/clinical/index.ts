/** Body-mass index to one decimal place, or null without both a height and a weight. */
export function calculateBMI(heightCm?: number | null, weightKg?: number | null): number | null {
  if (!heightCm || !weightKg) return null;
  return Number((weightKg / (heightCm / 100) ** 2).toFixed(1));
}

export type BMICategory = "underweight" | "healthy" | "overweight" | "obese";

/** The WHO adult band for a BMI. */
export function bmiCategory(bmi: number): BMICategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "healthy";
  if (bmi < 30) return "overweight";
  return "obese";
}

export const BMI_CATEGORY_LABELS: Record<BMICategory, string> = {
  underweight: "Underweight",
  healthy: "Healthy",
  overweight: "Overweight",
  obese: "Obese",
};


export * from "./vitals";
