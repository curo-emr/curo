"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import Link from "next/link";
import { Check, CheckCircle2, ClipboardList, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import type { Task, Patient } from "@/types";
import { Button } from "@curo/web/ui/button";
import { SectionCard } from "@curo/web/ui/section-card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { updateTask } from "@/lib/api/tasks";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { labResultQueries, taskQueries } from "@/lib/queries";

interface Props {
  practitionerId?: string | null;
  /** Names the patients in the lab results. */
  patients: Record<string, Patient>;
}

export function NeedsAttention({ practitionerId, patients }: Props) {
  const queryClient = useQueryClient();
  const tasks = useQuery(taskQueries.open());
  const labOrders = useQuery(labResultQueries.recent(practitionerId));

  // The task leaves the list at once, and comes back if the update fails.
  const resolve = useMutation({
    mutationFn: (task: Task) => updateTask(task.id, { status: "completed" }),
    onMutate: async task => {
      await queryClient.cancelQueries({ queryKey: taskQueries.all });
      queryClient.setQueryData(taskQueries.open().queryKey, prev => prev?.filter(t => t.id !== task.id));
    },
    onSuccess: () => toast.success("Task resolved"),
    onError: () => toast.error("Could not resolve the task"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskQueries.all }),
  });

  return (
    <div className="space-y-6">
      <SectionCard icon={ClipboardList} title="Tasks" count={tasks.data?.length} noPadding>
        <QueryContent query={tasks} what="tasks">
          {list => list.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up" className="py-8" />
          ) : (
            <ul className="divide-y">
              {list.map(task => (
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
                  <Button variant="outline" size="xs" onClick={() => resolve.mutate(task)} aria-label={`Resolve ${task.title}`}>
                    <Check /> Done
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </QueryContent>
      </SectionCard>

      <SectionCard icon={FlaskConical} title="Recent lab results" description="Results returned in the last 7 days" count={labOrders.data?.length} noPadding>
        <QueryContent query={labOrders} what="lab results">
          {list => list.length === 0 ? (
            <EmptyState icon={FlaskConical} title="No new results" className="py-8" />
          ) : (
            <ul className="divide-y">
              {list.slice(0, 6).map(lab => (
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
        </QueryContent>
      </SectionCard>
    </div>
  );
}
