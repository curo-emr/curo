// ─── Lab test search ─────────────────────────────────────────────────────────
// The one way every portal searches a lab catalog. Doctors type the short
// names they use on the ward ("CBC", "LFT", "U&E"), which a catalog name
// rarely contains, so each test also answers to its common abbreviations and
// other names. They are keyed by LOINC code, so every lab's entry for a test
// shares them.

const OTHER_NAMES: Record<string, readonly string[]> = {
  "58410-2": ["CBC", "FBC", "FBP", "Complete Blood Count", "Blood picture"], // Full blood count
  "2345-7": ["FBS", "FBG", "FPG", "Blood sugar"], // Fasting glucose
  "17856-6": ["A1c", "Glycated haemoglobin", "Glycated hemoglobin"], // HbA1c
  "24331-1": ["Lipid profile", "Cholesterol"], // Lipid panel
  "24362-6": ["RFT", "KFT", "U&E", "UEC", "Kidney function", "Renal profile"], // Renal panel
  "24325-3": ["LFT", "Hepatic panel", "Liver profile"], // Liver panel
  "3016-3": ["TFT", "Thyroid function"], // TSH
  "5902-2": ["INR", "PT/INR", "Clotting"], // Prothrombin time
};

/** What a search reads of a catalog test; the analytes are what it reports, when the caller has them. */
export interface SearchableLabTest {
  code: string;
  name: string;
  category?: string | null;
  analytes?: readonly { display: string }[] | null;
}

/**
 * Whether a test answers `query`: anywhere in its name, code, category or the
 * values it reports, or at the start of one of its other names. Only the start,
 * so a fragment such as "ft" doesn't bring up every "…FT" abbreviation.
 */
export function matchesLabTest(test: SearchableLabTest, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const described = [test.name, test.code, test.category ?? "", ...(test.analytes ?? []).map(a => a.display)];
  return (
    described.some(text => text.toLowerCase().includes(q)) ||
    (OTHER_NAMES[test.code] ?? []).some(name => name.toLowerCase().startsWith(q))
  );
}
