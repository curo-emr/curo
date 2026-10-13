// ─── ICD-10 codes ────────────────────────────────────────────────────────────
// A diagnosis is recorded in words, with its code when the doctor gives one.
// The same rule as @curo/shared/icd10, which the API checks codes with, so a
// code is tidied as the API will save it and a malformed one is caught before
// signing.

// A category of a letter and two letters or digits (R51, M1A, QA0), then up
// to four characters after the dot: R51.9, J45.909, S72.001A.
const ICD10_CODE = /^[A-Z][\dA-Z]{2}(\.[\dA-Z]{1,4})?$/;

/** A code as written, in capitals and dotted after the category ("r519" → "R51.9"); blank is "". */
export function tidyIcd10Code(code: string): string {
  const tidy = code.replace(/\s/g, "").toUpperCase();
  return tidy.length > 3 && !tidy.includes(".") ? `${tidy.slice(0, 3)}.${tidy.slice(3)}` : tidy;
}

/** Whether a code (as written) is no code at all, or a well-formed ICD-10 one. */
export const isBlankOrIcd10Code = (code: string): boolean => {
  const tidy = tidyIcd10Code(code);
  return !tidy || ICD10_CODE.test(tidy);
};
