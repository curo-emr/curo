import { Prescription } from "@/types";

interface PharmacyDashboardStatsProps {
  prescriptions: Prescription[];
  /** Drugs at or below their reorder level. */
  lowStockCount: number;
}

export function PharmacyDashboardStats({ prescriptions, lowStockCount }: PharmacyDashboardStatsProps) {
  const pendingCount = prescriptions.filter(p => p.status === 'sent_to_pharmacy' || p.status === 'active').length;
  const onHoldCount = prescriptions.filter(p => p.status === 'draft').length;
  const dispensedCount = prescriptions.filter(p => p.status === 'completed').length;

  const statCards = [
    { label: "Pending Prescriptions", value: pendingCount, color: "text-status-warning-text bg-status-warning-bg border-status-warning-border" },
    { label: "On hold", value: onHoldCount, color: "text-status-teal-text bg-status-teal-bg border-status-teal-border" },
    { label: "Dispensed", value: dispensedCount, color: "text-status-success-text bg-status-success-bg border-status-success-border" },
    { label: "Low Stock Items", value: lowStockCount, color: "text-status-error-text bg-status-error-bg border-status-error-border" },
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
