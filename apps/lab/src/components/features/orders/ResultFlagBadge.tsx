import { RESULT_FLAG_META, type ResultFlag } from "@curo/web/clinical";
import { Badge } from "@curo/web/ui/badge";
import { toneClass } from "@curo/web/ui/status-badge";

export function ResultFlagBadge({ flag }: { flag: ResultFlag }) {
  const { label, tone } = RESULT_FLAG_META[flag];
  return <Badge variant="outline" className={toneClass(tone)}>{label}</Badge>;
}
