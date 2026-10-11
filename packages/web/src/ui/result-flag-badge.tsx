import { RESULT_FLAG_META, type ResultFlag } from "../clinical";
import { Badge } from "./badge";
import { toneClass } from "./tones";

/** A lab result's flag (High, Low, Critical…) in its colour. */
export function ResultFlagBadge({ flag }: { flag: ResultFlag }) {
  const { label, tone } = RESULT_FLAG_META[flag];
  return <Badge variant="outline" className={toneClass(tone)}>{label}</Badge>;
}
