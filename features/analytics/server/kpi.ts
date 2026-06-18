import { z } from "zod";
import { db } from "@/lib/db";
import { getOffset, getPagination, getSortClause, likeSearch, type ListQuery } from "@/features/shared/server/query";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
};

const nullableUuid = z.preprocess(emptyToNull, z.string().uuid().nullable().optional());

const kpiSnapshotInputSchema = z.object({
  periodStart: z.string().date("Vui lòng nhập ngày bắt đầu"),
  periodEnd: z.string().date("Vui lòng nhập ngày kết thúc"),
  employeeId: nullableUuid,
  departmentId: nullableUuid,
}).refine((value) => value.periodEnd >= value.periodStart, {
  message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
  path: ["periodEnd"],
});

export async function listKpiSnapshots(
  query: ListQuery,
  filters: { employeeId?: string | null; departmentId?: string | null; periodStart?: string | null; periodEnd?: string | null } = {},
) {
  const values: unknown[] = [];
  const where = ["true"];

  if (query.search) {
    values.push(likeSearch(query.search));
    where.push(`(coalesce(e.employee_code, '') ilike $${values.length} or coalesce(e.full_name, '') ilike $${values.length} or coalesce(d.name, '') ilike $${values.length})`);
  }
  if (filters.employeeId) {
    values.push(z.string().uuid().parse(filters.employeeId));
    where.push(`ks.employee_id = $${values.length}`);
  }
  if (filters.departmentId) {
    values.push(z.string().uuid().parse(filters.departmentId));
    where.push(`ks.department_id = $${values.length}`);
  }
  if (filters.periodStart) {
    values.push(z.string().date().parse(filters.periodStart));
    where.push(`ks.period_end >= $${values.length}`);
  }
  if (filters.periodEnd) {
    values.push(z.string().date().parse(filters.periodEnd));
    where.push(`ks.period_start <= $${values.length}`);
  }

  const whereSql = where.join(" and ");
  const totalResult = await db.query<{ total: string }>(
    `
      select count(*)::text as total
      from kpi_snapshots ks
      left join employees e on e.id = ks.employee_id
      left join departments d on d.id = ks.department_id
      where ${whereSql}
    `,
    values,
  );
  const pagination = getPagination(query.page, query.pageSize, Number(totalResult.rows[0]?.total ?? 0));
  values.push(query.pageSize, getOffset(query.page, query.pageSize));
  const result = await db.query(
    `
      select
        ks.id,
        ks.period_start as "periodStart",
        ks.period_end as "periodEnd",
        ks.employee_id as "employeeId",
        e.employee_code as "employeeCode",
        e.full_name as "employeeName",
        ks.department_id as "departmentId",
        d.name as "departmentName",
        ks.total_revenue_amount as "totalRevenueAmount",
        ks.recurring_revenue_amount as "recurringRevenueAmount",
        ks.one_time_revenue_amount as "oneTimeRevenueAmount",
        ks.payroll_cost_amount as "payrollCostAmount",
        ks.benefit_cost_amount as "benefitCostAmount",
        ks.commission_amount as "commissionAmount",
        ks.payroll_cost_revenue_ratio as "payrollCostRevenueRatio",
        ks.created_at as "createdAt",
        ks.updated_at as "updatedAt"
      from kpi_snapshots ks
      left join employees e on e.id = ks.employee_id
      left join departments d on d.id = ks.department_id
      where ${whereSql}
      order by ${getSortClause(query.sortBy, query.sortOrder, {
        periodStart: "ks.period_start",
        periodEnd: "ks.period_end",
        employeeName: "e.full_name",
        departmentName: "d.name",
        totalRevenueAmount: "ks.total_revenue_amount",
        payrollCostAmount: "ks.payroll_cost_amount",
        payrollCostRevenueRatio: "ks.payroll_cost_revenue_ratio",
        createdAt: "ks.created_at",
      }, "ks.created_at")}
      limit $${values.length - 1} offset $${values.length}
    `,
    values,
  );

  return { rows: result.rows, pagination };
}

export async function getKpiSnapshot(id: string) {
  const result = await db.query(
    `
      select id, period_start as "periodStart", period_end as "periodEnd",
             employee_id as "employeeId", department_id as "departmentId",
             total_revenue_amount as "totalRevenueAmount",
             recurring_revenue_amount as "recurringRevenueAmount",
             one_time_revenue_amount as "oneTimeRevenueAmount",
             payroll_cost_amount as "payrollCostAmount",
             benefit_cost_amount as "benefitCostAmount",
             commission_amount as "commissionAmount",
             payroll_cost_revenue_ratio as "payrollCostRevenueRatio",
             snapshot_data as "snapshotData", created_at as "createdAt"
      from kpi_snapshots
      where id = $1
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function generateKpiSnapshots(input: unknown) {
  const data = kpiSnapshotInputSchema.parse(input);
  const client = await db.connect();

  try {
    await client.query("begin");
    const employees = await client.query<{ id: string; departmentId: string | null }>(
      `
        select id, department_id as "departmentId"
        from employees
        where deleted_at is null
          and ($1::uuid is null or id = $1)
          and ($2::uuid is null or department_id = $2)
      `,
      [data.employeeId ?? null, data.departmentId ?? null],
    );

    for (const employee of employees.rows) {
      const metrics = await client.query(
        `
          select
            coalesce(sum(o.net_revenue_amount), 0) as "totalRevenueAmount",
            coalesce(sum(o.net_revenue_amount) filter (where o.order_type = 'recurring'), 0) as "recurringRevenueAmount",
            coalesce(sum(o.net_revenue_amount) filter (where o.order_type = 'one_time'), 0) as "oneTimeRevenueAmount"
          from orders o
          where o.deleted_at is null
            and o.status not in ('draft', 'cancelled')
            and o.commission_employee_id = $1
            and o.document_date between $2 and $3
        `,
        [employee.id, data.periodStart, data.periodEnd],
      );
      const payroll = await client.query(
        `
          select coalesce(sum(pl.gross_salary_amount + pl.employer_insurance_amount), 0) as "payrollCostAmount",
                 coalesce(sum(pl.allowance_bonus_amount), 0) as "benefitCostAmount"
          from payroll_lines pl
          join payroll_periods pp on pp.id = pl.payroll_period_id
          where pl.deleted_at is null
            and pp.deleted_at is null
            and pp.status in ('approved', 'locked', 'paid')
            and pl.employee_id = $1
            and pp.period_start >= $2
            and pp.period_end <= $3
        `,
        [employee.id, data.periodStart, data.periodEnd],
      );
      const totalRevenueAmount = Number(metrics.rows[0]?.totalRevenueAmount ?? 0);
      const payrollCostAmount = Number(payroll.rows[0]?.payrollCostAmount ?? 0);
      const ratio = totalRevenueAmount > 0 ? payrollCostAmount / totalRevenueAmount : null;

      await client.query(
        `
          insert into kpi_snapshots (
            period_start, period_end, employee_id, department_id,
            total_revenue_amount, recurring_revenue_amount, one_time_revenue_amount,
            payroll_cost_amount, benefit_cost_amount, commission_amount,
            payroll_cost_revenue_ratio, snapshot_data
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, $11)
          on conflict (period_start, period_end, employee_id, department_id)
          do update set
            total_revenue_amount = excluded.total_revenue_amount,
            recurring_revenue_amount = excluded.recurring_revenue_amount,
            one_time_revenue_amount = excluded.one_time_revenue_amount,
            payroll_cost_amount = excluded.payroll_cost_amount,
            benefit_cost_amount = excluded.benefit_cost_amount,
            payroll_cost_revenue_ratio = excluded.payroll_cost_revenue_ratio,
            snapshot_data = excluded.snapshot_data,
            updated_at = now()
        `,
        [
          data.periodStart,
          data.periodEnd,
          employee.id,
          employee.departmentId,
          totalRevenueAmount,
          metrics.rows[0]?.recurringRevenueAmount ?? 0,
          metrics.rows[0]?.oneTimeRevenueAmount ?? 0,
          payrollCostAmount,
          payroll.rows[0]?.benefitCostAmount ?? 0,
          ratio,
          { source: "orders/payroll_lines", generatedAt: new Date().toISOString() },
        ],
      );
    }

    await client.query("commit");

    return { generated: employees.rows.length };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
