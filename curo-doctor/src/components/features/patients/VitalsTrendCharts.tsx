"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceArea, Dot,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Loader2, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getObservationTrends, type TrendPoint } from "@/lib/api/clinical";

// Standard clinical reference ranges used for high/low flagging.
interface Metric {
  key: string;
  title: string;
  unit: string;
  codes: { code: string; label: string; color: string }[];
  low: number;
  high: number;
}

const METRICS: Metric[] = [
  {
    key: "bp",
    title: "Blood Pressure",
    unit: "mmHg",
    low: 60, // diastolic lower bound used for axis context; per-series flagging below
    high: 140,
    codes: [
      { code: "8480-6", label: "Systolic", color: "var(--chart-1)" },
      { code: "8462-4", label: "Diastolic", color: "var(--chart-3)" },
    ],
  },
  {
    key: "glucose",
    title: "Blood Sugar (Glucose)",
    unit: "mg/dL",
    low: 70,
    high: 110,
    codes: [{ code: "2345-7", label: "Glucose", color: "var(--chart-2)" }],
  },
  {
    key: "cholesterol",
    title: "Total Cholesterol",
    unit: "mg/dL",
    low: 0,
    high: 200,
    codes: [{ code: "2093-3", label: "Cholesterol", color: "var(--chart-4)" }],
  },
];

// Per-code normal ranges for point flagging.
const CODE_RANGE: Record<string, { low: number; high: number }> = {
  "8480-6": { low: 90, high: 140 },  // systolic
  "8462-4": { low: 60, high: 90 },   // diastolic
  "2345-7": { low: 70, high: 110 },  // glucose
  "2093-3": { low: 0, high: 200 },   // cholesterol
};

const ALL_CODES = METRICS.flatMap((m) => m.codes.map((c) => c.code));

function flagOf(code: string, value: number): "high" | "low" | "normal" {
  const r = CODE_RANGE[code];
  if (!r) return "normal";
  if (value > r.high) return "high";
  if (value < r.low) return "low";
  return "normal";
}

export function VitalsTrendCharts({ patientId }: { patientId: string }) {
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getObservationTrends(patientId, ALL_CODES)
      .then(setPoints)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [patientId]);

  const abnormal = useMemo(
    () => points.filter((p) => flagOf(p.code, p.value) !== "normal"),
    [points],
  );

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {abnormal.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-sm">
          <TriangleAlert className="h-4 w-4 text-status-warning-text mt-0.5 shrink-0" />
          <p className="text-status-warning-text">
            {abnormal.length} reading{abnormal.length !== 1 ? "s" : ""} outside the normal range — flagged in red below.
          </p>
        </div>
      )}

      {METRICS.map((metric) => (
        <MetricChart key={metric.key} metric={metric} points={points} />
      ))}
    </div>
  );
}

function MetricChart({ metric, points }: { metric: Metric; points: TrendPoint[] }) {
  // Build a date-keyed dataset merging this metric's codes.
  const data = useMemo(() => {
    const byDate = new Map<string, any>();
    for (const p of points) {
      if (!metric.codes.some((c) => c.code === p.code)) continue;
      const day = p.effectiveDateTime.slice(0, 10);
      const row = byDate.get(day) ?? { day, label: format(parseISO(p.effectiveDateTime), "dd MMM") };
      row[p.code] = p.value;
      byDate.set(day, row);
    }
    return Array.from(byDate.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [points, metric]);

  const latestFlags = metric.codes
    .map((c) => {
      const pts = points.filter((p) => p.code === c.code).sort((a, b) => a.effectiveDateTime.localeCompare(b.effectiveDateTime));
      const last = pts[pts.length - 1];
      return last ? { label: c.label, value: last.value, unit: last.unit, flag: flagOf(c.code, last.value) } : null;
    })
    .filter(Boolean) as { label: string; value: number; unit: string; flag: string }[];

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">{metric.title}</CardTitle>
        <div className="flex gap-2 flex-wrap">
          {latestFlags.map((f) => (
            <Badge
              key={f.label}
              variant="outline"
              className={
                f.flag === "high" ? "bg-status-error-bg text-status-error-text border-status-error-border"
                  : f.flag === "low" ? "bg-status-info-bg text-status-info-text border-status-info-border"
                    : "bg-status-success-bg text-status-success-text border-status-success-border"
              }
            >
              {f.label}: {f.value} {f.unit}{f.flag !== "normal" ? ` (${f.flag})` : ""}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No data recorded.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" domain={["auto", "auto"]} />
              {/* Shaded normal band for single-series metrics */}
              {metric.codes.length === 1 && (
                <ReferenceArea y1={CODE_RANGE[metric.codes[0].code].low} y2={CODE_RANGE[metric.codes[0].code].high} fill="var(--status-success-bg)" fillOpacity={0.4} />
              )}
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              {metric.codes.map((c) => (
                <Line
                  key={c.code}
                  type="monotone"
                  dataKey={c.code}
                  name={c.label}
                  stroke={c.color}
                  strokeWidth={2}
                  connectNulls
                  dot={(props: any) => {
                    const v = props.payload?.[c.code];
                    const flag = v != null ? flagOf(c.code, v) : "normal";
                    const color = flag === "normal" ? c.color : "var(--status-error-text)";
                    return <Dot key={`${c.code}-${props.index}`} cx={props.cx} cy={props.cy} r={flag === "normal" ? 3 : 5} fill={color} stroke={color} />;
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
