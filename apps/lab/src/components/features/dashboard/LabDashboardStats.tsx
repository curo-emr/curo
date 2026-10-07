import type { LabOrder } from "@/types";

interface LabDashboardStatsProps {
  /** How many of the lab's orders are in each status. */
  counts: Partial<Record<LabOrder["status"], number>>;
}

export function LabDashboardStats({ counts }: LabDashboardStatsProps) {
  const pendingCount = counts.sent_to_lab ?? 0;
  const inProgressCount = counts.results_pending ?? 0;
  const awaitingVerification = counts.draft ?? 0;
  const completedToday = counts.completed ?? 0;

  const statCards = [
    { label: "Pending Orders", value: pendingCount, color: "text-status-warning-text bg-status-warning-bg border-status-warning-border" },
    { label: "In progress", value: inProgressCount, color: "text-primary bg-primary/10 border-primary/20" },
    { label: "Awaiting Verification", value: awaitingVerification, color: "text-status-purple-text bg-status-purple-bg border-status-purple-border" },
    { label: "Completed", value: completedToday, color: "text-status-success-text bg-status-success-bg border-status-success-border" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map(stat => (
        <div key={stat.label} className={`rounded-lg border p-4 ${stat.color}`}>
          <p className="text-xs font-medium opacity-80">{stat.label}</p>
          <p className="text-2xl font-bold mt-1">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
