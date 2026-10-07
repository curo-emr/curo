const PATIENT_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Patient code printed on cards and labels: `CUR-` + 8 random letters or digits. */
export function generatePatientCode(
  random: () => number = Math.random,
): string {
  let code = 'CUR-';
  for (let i = 0; i < 8; i++)
    code +=
      PATIENT_CODE_CHARS[Math.floor(random() * PATIENT_CODE_CHARS.length)];
  return code;
}
