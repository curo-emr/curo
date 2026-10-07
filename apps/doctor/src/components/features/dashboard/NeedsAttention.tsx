"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, ClipboardList, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import type { LabOrder, Task, Patient } from "@/types";
import { Button } from "@curo/web/ui/button";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { updateTask } from "@/lib/api/tasks";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface Props {
  tasks: Task[];
  labOrders: LabOrder[];
  patients: Record<string, Patient>;
}

export function NeedsAttention({ tasks: initialTasks, labOrders, patients }: Props) {
  const [tasks, setTasks] = useState(initialTasks);

  const resolve = async (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    try {
      await updateTask(task.id, { status: "completed" });
      toast.success("Task resolved");
    } catch {
      setTasks(prev => [task, ...prev]);
      toast.error("Could not resolve the task");
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard icon={ClipboardList} title="Tasks" count={tasks.length} noPadding>
        {tasks.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All caught up" className="py-8" />
        ) : (
          <ul className="divide-y">
            {tasks.map(task => (
              <li key={task.id} className="flex items-start gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {task.title}
                    {task.priority === "high" && (
                      <span className="ml-2 rounded-full bg-status-error-bg px-1.5 py-px text-[11px] font-medium text-status-error-text">High</span>
                    )}
                  </p>
                  {task.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.relatedPatientId && (
                      <Link href={ROUTES.PATIENT(task.relatedPatientId)} className="text-primary hover:underline">Open chart</Link>
                    )}
                    {task.relatedPatientId && task.dueDate && " · "}
                    {task.dueDate && `Due ${formatDate(task.dueDate)}`}
                  </p>
                </div>
                <Button variant="outline" size="xs" onClick={() => resolve(task)} aria-label={`Resolve ${task.title}`}>
                  <Check /> Done
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard icon={FlaskConical} title="Recent lab results" description="Results returned in the last 7 days" count={labOrders.length} noPadding>
        {labOrders.length === 0 ? (
          <EmptyState icon={FlaskConical} title="No new results" className="py-8" />
        ) : (
          <ul className="divide-y">
            {labOrders.slice(0, 6).map(lab => (
              <li key={lab.id}>
                <Link href={`${ROUTES.PATIENT(lab.patientId)}?tab=labs`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{patients[lab.patientId]?.name.full ?? "Patient"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lab.tests.map(t => t.display).join(", ")} · {formatDate(lab.createdAt)}
                    </p>
                  </div>
                  {lab.priority !== "routine" && (
                    <span className="rounded-full bg-status-error-bg px-1.5 py-px text-[11px] font-medium uppercase text-status-error-text">{lab.priority}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
