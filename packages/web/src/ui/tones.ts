// Each tone is a bg/text/border triplet from the status palette in styles.css.
export const TONES = {
  neutral: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border",
  info: "bg-status-info-bg text-status-info-text border-status-info-border",
  teal: "bg-status-teal-bg text-status-teal-text border-status-teal-border",
  success: "bg-status-success-bg text-status-success-text border-status-success-border",
  warning: "bg-status-warning-bg text-status-warning-text border-status-warning-border",
  error: "bg-status-error-bg text-status-error-text border-status-error-border",
  purple: "bg-status-purple-bg text-status-purple-text border-status-purple-border",
} as const;

export type Tone = keyof typeof TONES;

/** A tone's classes, for a pill or badge that isn't a status, such as a BMI category. */
export const toneClass = (tone: Tone) => TONES[tone];

/** How long someone has waited, as a tone: fine, then warning after 15 minutes, then error after 30. */
export function waitTone(minutes: number): Tone {
  if (minutes > 30) return "error";
  if (minutes > 15) return "warning";
  return "success";
}
