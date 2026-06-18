"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";

type DashboardData = {
  periodStart: string;
  periodEnd: string;
  summary: {
    totalRevenue: number;
    recurringRevenue: number;
    oneTimeRevenue: number;
    orderCount: number;
    debtBalance: number;
    overdueDebt: number;
    payrollCost: number;
    bankTransfer: number;
    payrollCostRevenueRatio: number | null;
  };
  topEmployees: Array<{ id: string; employeeName: string; revenueAmount: string | number }>;
  topCustomers: Array<{ id: string; customerName: string; revenueAmount: string | number }>;
};

export function DashboardPage() {
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [periodStart, setPeriodStart] = useState(defaultRange.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultRange.periodEnd);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDashboard() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ periodStart, periodEnd });
      const response = await fetch(`/api/dashboard/overview?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Không tải được dashboard");
      }

      setData(payload.data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Không tải được dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Dashboard data is loaded from the server when the screen opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = data?.summary;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="border-b border-zinc-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Dashboard vận hành</h1>
            <p className="mt-1 text-sm text-zinc-500">Tổng hợp doanh thu, công nợ, chi phí lương và KPI nhân sự.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="h-10 rounded-md border border-zinc-300 px-3 text-sm" />
            <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="h-10 rounded-md border border-zinc-300 px-3 text-sm" />
            <button type="button" onClick={() => void fetchDashboard()} className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Tải dữ liệu
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Tổng doanh thu" value={formatCurrency(summary?.totalRevenue ?? 0)} loading={loading} />
          <MetricCard label="Doanh thu định kỳ" value={formatCurrency(summary?.recurringRevenue ?? 0)} loading={loading} />
          <MetricCard label="Doanh thu một lần" value={formatCurrency(summary?.oneTimeRevenue ?? 0)} loading={loading} />
          <MetricCard label="Số đơn hàng" value={formatNumber(summary?.orderCount ?? 0)} loading={loading} />
          <MetricCard label="Công nợ hiện tại" value={formatCurrency(summary?.debtBalance ?? 0)} loading={loading} />
          <MetricCard label="Nợ quá hạn" value={formatCurrency(summary?.overdueDebt ?? 0)} loading={loading} />
          <MetricCard label="Chi phí lương" value={formatCurrency(summary?.payrollCost ?? 0)} loading={loading} />
          <MetricCard label="Tỷ lệ lương/DT" value={summary?.payrollCostRevenueRatio === null ? "Chưa có" : `${((summary?.payrollCostRevenueRatio ?? 0) * 100).toFixed(2)}%`} loading={loading} />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <RankingTable title="Top nhân viên theo doanh thu" nameKey="employeeName" rows={data?.topEmployees ?? []} loading={loading} />
          <RankingTable title="Top khách hàng theo doanh thu" nameKey="customerName" rows={data?.topCustomers ?? []} loading={loading} />
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <div className="mt-2 text-2xl font-semibold">{loading ? <span className="inline-block h-8 w-28 animate-pulse rounded bg-zinc-100" /> : value}</div>
    </div>
  );
}

function RankingTable({ title, nameKey, rows, loading }: { title: string; nameKey: "employeeName" | "customerName"; rows: Array<Record<string, string | number>>; loading: boolean }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3 text-right">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td className="border-t border-zinc-100 px-4 py-3"><div className="h-4 w-44 animate-pulse rounded bg-zinc-100" /></td>
                  <td className="border-t border-zinc-100 px-4 py-3"><div className="ml-auto h-4 w-24 animate-pulse rounded bg-zinc-100" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={2} className="px-4 py-8 text-center text-sm text-zinc-500">Chưa có dữ liệu</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={String(row.id)}>
                  <td className="border-t border-zinc-100 px-4 py-3">{row[nameKey]}</td>
                  <td className="border-t border-zinc-100 px-4 py-3 text-right font-medium">{formatCurrency(row.revenueAmount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getCurrentMonthRange() {
  const date = new Date();
  return {
    periodStart: formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1)),
    periodEnd: formatLocalDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
