import { z } from "zod";
import { db } from "@/lib/db";

export async function getDashboardOverview(searchParams: URLSearchParams) {
  const periodStart = z.string().date().optional().parse(searchParams.get("periodStart") || undefined) ?? firstDayOfCurrentMonth();
  const periodEnd = z.string().date().optional().parse(searchParams.get("periodEnd") || undefined) ?? lastDayOfCurrentMonth();

  const [revenue, debt, payroll, topEmployees, topCustomers] = await Promise.all([
    db.query(
      `
        select
          coalesce(sum(net_revenue_amount), 0) as "totalRevenue",
          coalesce(sum(net_revenue_amount) filter (where order_type = 'recurring'), 0) as "recurringRevenue",
          coalesce(sum(net_revenue_amount) filter (where order_type = 'one_time'), 0) as "oneTimeRevenue",
          count(*)::int as "orderCount"
        from orders
        where deleted_at is null
          and status not in ('draft', 'cancelled')
          and document_date between $1 and $2
      `,
      [periodStart, periodEnd],
    ),
    db.query(`
      select
        (select coalesce(sum(debit_amount - credit_amount), 0) from debt_entries where deleted_at is null) as "debtBalance",
        (select coalesce(sum(greatest(total_amount - paid_amount, 0)), 0)
         from orders
         where deleted_at is null
           and due_date < current_date
           and status in ('issued', 'partially_paid')) as "overdueDebt"
    `),
    db.query(
      `
        select coalesce(sum(pl.gross_salary_amount + pl.employer_insurance_amount), 0) as "payrollCost",
               coalesce(sum(pl.bank_transfer_amount), 0) as "bankTransfer"
        from payroll_lines pl
        join payroll_periods pp on pp.id = pl.payroll_period_id
        where pl.deleted_at is null
          and pp.deleted_at is null
          and pp.status in ('approved', 'locked', 'paid')
          and pp.period_start >= $1
          and pp.period_end <= $2
      `,
      [periodStart, periodEnd],
    ),
    db.query(
      `
        select e.id, e.full_name as "employeeName", coalesce(sum(o.net_revenue_amount), 0) as "revenueAmount"
        from orders o
        join employees e on e.id = o.commission_employee_id
        where o.deleted_at is null
          and o.status not in ('draft', 'cancelled')
          and o.document_date between $1 and $2
        group by e.id, e.full_name
        order by "revenueAmount" desc
        limit 8
      `,
      [periodStart, periodEnd],
    ),
    db.query(
      `
        select c.id, c.company_name as "customerName", coalesce(sum(o.net_revenue_amount), 0) as "revenueAmount"
        from orders o
        join customers c on c.id = o.customer_id
        where o.deleted_at is null
          and o.status not in ('draft', 'cancelled')
          and o.document_date between $1 and $2
        group by c.id, c.company_name
        order by "revenueAmount" desc
        limit 8
      `,
      [periodStart, periodEnd],
    ),
  ]);

  const totalRevenue = Number(revenue.rows[0]?.totalRevenue ?? 0);
  const payrollCost = Number(payroll.rows[0]?.payrollCost ?? 0);

  return {
    periodStart,
    periodEnd,
    summary: {
      totalRevenue,
      recurringRevenue: Number(revenue.rows[0]?.recurringRevenue ?? 0),
      oneTimeRevenue: Number(revenue.rows[0]?.oneTimeRevenue ?? 0),
      orderCount: Number(revenue.rows[0]?.orderCount ?? 0),
      debtBalance: Number(debt.rows[0]?.debtBalance ?? 0),
      overdueDebt: Number(debt.rows[0]?.overdueDebt ?? 0),
      payrollCost,
      bankTransfer: Number(payroll.rows[0]?.bankTransfer ?? 0),
      payrollCostRevenueRatio: totalRevenue > 0 ? payrollCost / totalRevenue : null,
    },
    topEmployees: topEmployees.rows,
    topCustomers: topCustomers.rows,
  };
}

function firstDayOfCurrentMonth() {
  const date = new Date();
  return formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

function lastDayOfCurrentMonth() {
  const date = new Date();
  return formatLocalDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
