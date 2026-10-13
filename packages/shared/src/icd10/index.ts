// ICD-10(-CM) codes, shared by the services that record diagnoses and
// database/import-icd10cm.ts, which fills the diagnosis list. The import
// reads this source directly (its image has no workspaces), so this folder
// must stay free of imports outside it.

/**
 * A category of a letter and two letters or digits (R51, M1A, QA0), then up
 * to four characters after the dot: R51.9, J45.909, S72.001A.
 */
export const ICD10_CODE = /^[A-Z][\dA-Z]{2}(\.[\dA-Z]{1,4})?$/;

/** A code as written, in capitals and dotted after the category ("r519" → "R51.9"); blank is "". */
export function tidyIcd10Code(code: string): string {
  const tidy = code.replace(/\s/g, '').toUpperCase();
  return tidy.length > 3 && !tidy.includes('.')
    ? `${tidy.slice(0, 3)}.${tidy.slice(3)}`
    : tidy;
}
