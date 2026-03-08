import { LabOrder } from "@/types";

interface LabDashboardStatsProps {
  orders: LabOrder[];
}

export function LabDashboardStats({ orders }: LabDashboardStatsProps) {
  const pendingCount = orders.filter(o => o.status === 'received' || o.status === 'collected').length;
  const inProgressCount = orders.filter(o => o.status === 'processing').length;
  const awaitingVerification = orders.filter(o => o.status === 'resulted').length;
  const completedToday = orders.filter(o =>
    (o.status === 'verified' || o.status === 'dispatched')
  ).length;

  const statCards = [
    { label: "Pending Orders", value: pendingCount, color: "text-status-warning-text bg-status-warning-bg border-status-warning-border" },
    { label: "In Progress", value: inProgressCount, color: "text-primary bg-primary/10 border-primary/20" },
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
