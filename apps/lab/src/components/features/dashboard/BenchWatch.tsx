import Link from "next/link";
import { ArrowRight, Cpu, ShieldCheck, TriangleAlert } from "lucide-react";
import { EmptyState } from "@curo/web/ui/empty-state";
import { SectionCard } from "@curo/web/ui/section-card";
import { StatusBadge, type Status } from "@curo/web/ui/status-badge";
import type { LabInstrument } from "@/lib/api/lab";
import { ROUTES } from "@/lib/constants";
import type { QCLog } from "@/types";

interface BenchWatchProps {
  /** The first few open QC alerts, and how many there are. */
  qcAlerts: { items: QCLog[]; total: number };
  instruments: LabInstrument[];
}

// What on the bench needs attention before patient samples run: controls that failed or warned, and the instruments.
export function BenchWatch({ qcAlerts, instruments }: BenchWatchProps) {
  const more = qcAlerts.total - qcAlerts.items.length;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard icon={TriangleAlert} iconClassName="text-status-warning-text" title="QC alerts" count={qcAlerts.total} noPadding>
        {qcAlerts.total === 0 ? (
          <EmptyState icon={ShieldCheck} title="All controls passing" description="Every control's latest run passed." className="py-8" />
        ) : (
          <>
            <ul className="divide-y">
              {qcAlerts.items.map(log => (
                <WatchRow
                  key={log.id}
                  title={`${log.testCode} · ${log.controlLevel} control`}
                  detail={log.notes || `Expected ${log.expectedValue}, got ${log.observedValue} ${log.unit}`}
                  status={log.status}
                />
              ))}
            </ul>
            <Link href={ROUTES.QC} className="flex items-center justify-center gap-1 border-t px-5 py-2.5 text-sm font-medium text-primary hover:bg-muted/50">
              {more > 0 ? `${more} more in quality control` : "Open quality control"} <ArrowRight className="size-3.5" />
            </Link>
          </>
        )}
      </SectionCard>

      <SectionCard icon={Cpu} iconClassName="text-status-info-text" title="Instruments" noPadding>
        {instruments.length === 0 ? (
          <EmptyState icon={Cpu} title="No instruments recorded" description="This lab has no instruments on its books yet." className="py-8" />
        ) : (
          <ul className="divide-y">
            {instruments.map(inst => (
              <WatchRow
                key={inst.id}
                title={inst.name}
                detail={[inst.model, inst.location].filter(Boolean).join(" · ")}
                status={inst.status as Status}
              />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function WatchRow({ title, detail, status }: { title: string; detail: string; status: Status }) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
      <StatusBadge status={status} className="shrink-0" />
    </li>
  );
}
