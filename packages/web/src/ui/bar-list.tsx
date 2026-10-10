export interface BarListItem {
  /** Tells apart items that share a label; the label by default. */
  id?: string;
  label: string;
  value: number;
  /** The value as shown beside the label, e.g. "12 units"; the plain number by default. */
  display?: string;
}

// Labelled bars, each as long as its value against the largest, e.g. the most-ordered tests.
export function BarList({ items }: { items: BarListItem[] }) {
  const most = Math.max(1, ...items.map(i => i.value));
  return (
    <ul className="space-y-3">
      {items.map(item => (
        <li key={item.id ?? item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-foreground">{item.label}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.display ?? item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / most) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
