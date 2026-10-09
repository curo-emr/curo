"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerPagination } from "@curo/web/hooks";
import { Loader2, Wallet, Receipt, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { LoadError } from "@curo/web/ui/load-error";
import { PageHeader } from "@curo/web/ui/page-header";
import { Pagination } from "@curo/web/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@curo/web/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@curo/web/ui/table";
import { getMyPaymentsPage } from "@/lib/api/payments";
import { paymentQueries } from "@/lib/queries";

type Period = "day" | "week" | "month";

function formatMoney(amount: number, currency = "LKR") {
  const formatted = amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "LKR" ? `Rs. ${formatted}` : `${currency} ${formatted}`;
}

function bucketLabel(iso: string, period: Period) {
  try {
    const d = parseISO(iso);
    if (period === "month") return format(d, "MMM yyyy");
    if (period === "week") return `wk ${format(d, "dd MMM")}`;
    return format(d, "dd MMM");
  } catch {
    return iso;
  }
}

export default function IncomePage() {
  const [period, setPeriod] = useState<Period>("day");
  const income = useQuery(paymentQueries.income(period));
  const summary = income.data;

  const chartData = useMemo(
    () => (summary?.buckets ?? []).map((b) => ({ label: bucketLabel(b.bucket, period), total: b.total })),
    [summary, period],
  );

  // Every payment you collected, latest first, a page at a time.
  const { items: payments, total: paymentCount, page, setPage, pageSize, setPageSize } =
    useServerPagination(getMyPaymentsPage);

  const currency = summary?.currency ?? "LKR";
  const avg = summary && summary.count > 0 ? summary.total / summary.count : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader title="My Income" description="Visit payments you have collected. Amounts are final once submitted.">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Per day</SelectItem>
            <SelectItem value="week">Per week</SelectItem>
            <SelectItem value="month">Per month</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {!summary ? (
        income.isError
          ? <LoadError what="income" onRetry={() => void income.refetch()} retrying={income.isFetching} />
          : <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-sm border">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-full bg-status-success-bg text-status-success-text flex items-center justify-center"><Wallet className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total income</p>
                  <p className="text-xl font-bold text-foreground">{formatMoney(summary.total, currency)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-full bg-status-info-bg text-status-info-text flex items-center justify-center"><Receipt className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Payments collected</p>
                  <p className="text-xl font-bold text-foreground">{summary.count}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-full bg-status-purple-bg text-status-purple-text flex items-center justify-center"><TrendingUp className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Average / payment</p>
                  <p className="text-xl font-bold text-foreground">{formatMoney(avg, currency)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b pb-3">
              <CardTitle className="text-base">Income per {period}</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">No income recorded yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <Tooltip
                      formatter={(value) => [formatMoney(Number(value), currency), "Income"]}
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                    />
                    <Bar dataKey="total" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b pb-3">
              <CardTitle className="text-base">Recent payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No payments yet.</TableCell></TableRow>
                  ) : (
                    payments.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                        <TableCell className="text-muted-foreground">{p.paidAt ? format(parseISO(p.paidAt), "dd MMM yyyy, HH:mm") : "—"}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{p.paymentMethod}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(Number(p.amount), p.currency)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {payments.length > 0 && (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={paymentCount}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
