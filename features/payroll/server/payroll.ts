import type { PoolClient } from "pg";
import { z } from "zod";
import { BadRequestError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { createManagementCrudService } from "@/features/shared/server/management-crud";
import {
  getOffset,
  getPagination,
  getSortClause,
  likeSearch,
  type ListQuery,
} from "@/features/shared/server/query";
import { calculateProgressiveTax, clampInsuranceBase, roundMoney, type TaxBracket } from "./calculations";
import { payrollInputPatchSchema, payrollInputSchema, payrollPeriodInputSchema, payrollPeriodPatchSchema, payrollPeriodStatusSchema } from "./validators";

const uuidFilterSchema = z.string().uuid();

const periodSelectSql = `
  pp.id,
  pp.period_code as "periodCode",
  pp.period_start as "periodStart",
  pp.period_end as "periodEnd",
  pp.status,
  pp.payroll_policy_version_id as "payrollPolicyVersionId",
  ppv.name as "payrollPolicyVersionName",
  pp.tax_policy_version_id as "taxPolicyVersionId",
  tpv.name as "taxPolicyVersionName",
  pp.insurance_policy_version_id as "insurancePolicyVersionId",
  ipv.name as "insurancePolicyVersionName",
  pp.calculated_at as "calculatedAt",
  pp.approved_at as "approvedAt",
  pp.locked_at as "lockedAt",
  pp.paid_at as "paidAt",
  pp.notes,
  coalesce(line_totals.line_count, 0) as "lineCount",
  coalesce(line_totals.gross_amount, 0) as "grossAmount",
  coalesce(line_totals.bank_transfer_amount, 0) as "bankTransferAmount",
  pp.created_at as "createdAt",
  pp.updated_at as "updatedAt"
`;

const periodFromSql = `
  from payroll_periods pp
  left join payroll_policy_versions ppv on ppv.id = pp.payroll_policy_version_id
  left join tax_policy_versions tpv on tpv.id = pp.tax_policy_version_id
  left join insurance_policy_versions ipv on ipv.id = pp.insurance_policy_version_id
  left join lateral (
    select count(pl.id)::int as line_count,
           coalesce(sum(pl.gross_salary_amount), 0) as gross_amount,
           coalesce(sum(pl.bank_transfer_amount), 0) as bank_transfer_amount
    from payroll_lines pl
    where pl.payroll_period_id = pp.id and pl.deleted_at is null
  ) line_totals on true
`;

const basePayrollPeriodService = createManagementCrudService({
  tableName: "payroll_periods",
  tableAlias: "pp",
  selectSql: periodSelectSql,
  fromSql: periodFromSql,
  searchColumns: ["pp.period_code", "pp.notes", "ppv.name", "tpv.name", "ipv.name"],
  sortColumns: {
    periodCode: "pp.period_code",
    periodStart: "pp.period_start",
    periodEnd: "pp.period_end",
    status: "pp.status",
    grossAmount: "line_totals.gross_amount",
    bankTransferAmount: "line_totals.bank_transfer_amount",
    createdAt: "pp.created_at",
  },
  defaultSort: "pp.created_at",
  fieldMap: {
    periodCode: "period_code",
    periodStart: "period_start",
    periodEnd: "period_end",
    status: "status",
    payrollPolicyVersionId: "payroll_policy_version_id",
    taxPolicyVersionId: "tax_policy_version_id",
    insurancePolicyVersionId: "insurance_policy_version_id",
    notes: "notes",
  },
  filters: {
    status: { column: "pp.status", schema: payrollPeriodStatusSchema },
  },
  inputSchema: payrollPeriodInputSchema,
  patchSchema: payrollPeriodPatchSchema,
});

export const payrollPeriodService = {
  ...basePayrollPeriodService,
  async update(id: string, input: unknown) {
    const current = await basePayrollPeriodService.get(id);

    if (!current) {
      return null;
    }

    if (["locked", "paid", "cancelled"].includes(String(current.status))) {
      throw new BadRequestError("Kỳ lương đã khóa, đã trả hoặc đã hủy không thể sửa");
    }

    return basePayrollPeriodService.update(id, input);
  },
  async remove(id: string) {
    const current = await basePayrollPeriodService.get(id);

    if (!current) {
      return false;
    }

    if (current.status !== "draft") {
      throw new BadRequestError("Chỉ được xóa kỳ lương nháp");
    }

    return basePayrollPeriodService.remove(id);
  },
};

export const payrollInputService = createManagementCrudService({
  tableName: "payroll_inputs",
  tableAlias: "pi",
  selectSql: `
    pi.id,
    pi.payroll_period_id as "payrollPeriodId",
    pp.period_code as "periodCode",
    pi.employee_id as "employeeId",
    e.employee_code as "employeeCode",
    e.full_name as "employeeName",
    pi.actual_workdays as "actualWorkdays",
    pi.unpaid_leave_days as "unpaidLeaveDays",
    pi.overtime_hours as "overtimeHours",
    pi.revenue_amount as "revenueAmount",
    pi.exceeded_revenue_amount as "exceededRevenueAmount",
    pi.one_time_job_revenue_amount as "oneTimeJobRevenueAmount",
    pi.new_customer_revenue_amount as "newCustomerRevenueAmount",
    pi.advance_amount as "advanceAmount",
    pi.reimbursement_amount as "reimbursementAmount",
    pi.taxable_adjustment_amount as "taxableAdjustmentAmount",
    pi.non_taxable_adjustment_amount as "nonTaxableAdjustmentAmount",
    pi.notes,
    pi.created_at as "createdAt",
    pi.updated_at as "updatedAt"
  `,
  fromSql: `
    from payroll_inputs pi
    join payroll_periods pp on pp.id = pi.payroll_period_id
    join employees e on e.id = pi.employee_id
  `,
  searchColumns: ["pp.period_code", "e.employee_code", "e.full_name", "pi.notes"],
  sortColumns: {
    periodCode: "pp.period_code",
    employeeName: "e.full_name",
    actualWorkdays: "pi.actual_workdays",
    revenueAmount: "pi.revenue_amount",
    advanceAmount: "pi.advance_amount",
    createdAt: "pi.created_at",
  },
  defaultSort: "pi.created_at",
  fieldMap: {
    payrollPeriodId: "payroll_period_id",
    employeeId: "employee_id",
    actualWorkdays: "actual_workdays",
    unpaidLeaveDays: "unpaid_leave_days",
    overtimeHours: "overtime_hours",
    revenueAmount: "revenue_amount",
    exceededRevenueAmount: "exceeded_revenue_amount",
    oneTimeJobRevenueAmount: "one_time_job_revenue_amount",
    newCustomerRevenueAmount: "new_customer_revenue_amount",
    advanceAmount: "advance_amount",
    reimbursementAmount: "reimbursement_amount",
    taxableAdjustmentAmount: "taxable_adjustment_amount",
    nonTaxableAdjustmentAmount: "non_taxable_adjustment_amount",
    notes: "notes",
  },
  filters: {
    payrollPeriodId: { column: "pi.payroll_period_id", schema: uuidFilterSchema },
    employeeId: { column: "pi.employee_id", schema: uuidFilterSchema },
  },
  inputSchema: payrollInputSchema,
  patchSchema: payrollInputPatchSchema,
  beforeCreate: async (data) => assertPeriodEditable(String(data.payrollPeriodId)),
  beforeUpdate: async (id) => {
    const current = await payrollInputService.get(id);
    if (current?.payrollPeriodId) {
      await assertPeriodEditable(String(current.payrollPeriodId));
    }
  },
});

export async function listPayrollLines(
  query: ListQuery,
  filters: { payrollPeriodId?: string | null; employeeId?: string | null; status?: string | null } = {},
) {
  const values: unknown[] = [];
  const where = ["pl.deleted_at is null"];

  if (query.search) {
    values.push(likeSearch(query.search));
    where.push(`(pp.period_code ilike $${values.length} or e.employee_code ilike $${values.length} or e.full_name ilike $${values.length})`);
  }
  if (filters.payrollPeriodId) {
    values.push(uuidFilterSchema.parse(filters.payrollPeriodId));
    where.push(`pl.payroll_period_id = $${values.length}`);
  }
  if (filters.employeeId) {
    values.push(uuidFilterSchema.parse(filters.employeeId));
    where.push(`pl.employee_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(payrollPeriodStatusSchema.parse(filters.status));
    where.push(`pl.status = $${values.length}`);
  }

  const whereSql = where.join(" and ");
  const totalResult = await db.query<{ total: string }>(
    `
      select count(*)::text as total
      from payroll_lines pl
      join payroll_periods pp on pp.id = pl.payroll_period_id
      join employees e on e.id = pl.employee_id
      where ${whereSql}
    `,
    values,
  );
  const pagination = getPagination(query.page, query.pageSize, Number(totalResult.rows[0]?.total ?? 0));
  values.push(query.pageSize, getOffset(query.page, query.pageSize));
  const result = await db.query(
    `
      select
        pl.id,
        pl.payroll_period_id as "payrollPeriodId",
        pp.period_code as "periodCode",
        pl.employee_id as "employeeId",
        e.employee_code as "employeeCode",
        e.full_name as "employeeName",
        d.name as "departmentName",
        pl.salary_payment_type as "salaryPaymentType",
        pl.contract_type as "contractType",
        pl.base_salary as "baseSalary",
        pl.standard_workdays as "standardWorkdays",
        pl.actual_workdays as "actualWorkdays",
        pl.time_salary_amount as "timeSalaryAmount",
        pl.gross_up_salary_amount as "grossUpSalaryAmount",
        pl.non_taxable_income_amount as "nonTaxableIncomeAmount",
        pl.taxable_income_amount as "taxableIncomeAmount",
        pl.allowance_bonus_amount as "allowanceBonusAmount",
        pl.gross_salary_amount as "grossSalaryAmount",
        pl.personal_deduction_amount as "personalDeductionAmount",
        pl.dependent_count as "dependentCount",
        pl.dependent_deduction_amount as "dependentDeductionAmount",
        pl.employee_insurance_amount as "employeeInsuranceAmount",
        pl.total_deduction_amount as "totalDeductionAmount",
        pl.taxable_amount as "taxableAmount",
        pl.personal_income_tax_amount as "personalIncomeTaxAmount",
        pl.net_salary_amount as "netSalaryAmount",
        pl.advance_amount as "advanceAmount",
        pl.reimbursement_amount as "reimbursementAmount",
        pl.other_adjustment_amount as "otherAdjustmentAmount",
        pl.bank_transfer_amount as "bankTransferAmount",
        pl.employer_insurance_amount as "employerInsuranceAmount",
        pl.total_insurance_amount as "totalInsuranceAmount",
        pl.status,
        pl.created_at as "createdAt",
        pl.updated_at as "updatedAt"
      from payroll_lines pl
      join payroll_periods pp on pp.id = pl.payroll_period_id
      join employees e on e.id = pl.employee_id
      left join departments d on d.id = e.department_id
      where ${whereSql}
      order by ${getSortClause(query.sortBy, query.sortOrder, {
        periodCode: "pp.period_code",
        employeeName: "e.full_name",
        grossSalaryAmount: "pl.gross_salary_amount",
        bankTransferAmount: "pl.bank_transfer_amount",
        status: "pl.status",
        createdAt: "pl.created_at",
      }, "pl.created_at")}
      limit $${values.length - 1} offset $${values.length}
    `,
    values,
  );

  return { rows: result.rows, pagination };
}

export async function getPayrollLine(id: string) {
  const result = await db.query(
    `
      select *
      from payroll_lines
      where id = $1 and deleted_at is null
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function calculatePayrollPeriod(id: string) {
  const client = await db.connect();

  try {
    await client.query("begin");
    const period = await getPeriodForUpdate(client, id);

    if (!period) {
      throw new BadRequestError("Không tìm thấy kỳ lương");
    }

    if (["locked", "paid", "cancelled"].includes(period.status)) {
      throw new BadRequestError("Kỳ lương đã khóa, đã trả hoặc đã hủy không thể tính lại");
    }

    await ensureSystemPayrollTypes(client);
    await client.query("delete from payroll_lines where payroll_period_id = $1", [id]);

    const [payrollPolicy, taxPolicy, insurancePolicy, taxBrackets, commissionPolicies] = await Promise.all([
      getPayrollPolicy(client, period),
      getTaxPolicy(client, period),
      getInsurancePolicy(client, period),
      getTaxBrackets(client, period.taxPolicyVersionId, period.periodEnd),
      getCommissionPolicies(client, period.periodEnd),
    ]);
    const employees = await getEmployeesForPayroll(client, period.periodStart, period.periodEnd);

    for (const employee of employees) {
      const standardWorkdays = Number(employee.standardWorkdays ?? payrollPolicy?.standardWorkdays ?? 26);
      const revenue = await getEmployeeRevenue(client, employee.id, period.periodStart, period.periodEnd);
      const inputId = await upsertPayrollInput(client, id, employee.id, standardWorkdays, revenue);
      const input = await getPayrollInput(client, inputId);
      const allowances = await getEmployeeAllowances(client, employee, period.periodEnd);
      const overrides = await getEmployeeOverrides(client, employee.id, period.periodEnd);
      const payrollSetting = employee.participatesInsurance === null ? { participatesInsurance: true } : employee;
      const exceededPolicy = pickCommissionPolicy(commissionPolicies, "exceeded_revenue", employee);
      const oneTimePolicy = pickCommissionPolicy(commissionPolicies, "one_time", employee);
      const newCustomerPolicy = pickCommissionPolicy(commissionPolicies, "new_customer", employee);
      const targetRevenue = Number(employee.baseSalary) * Number(exceededPolicy?.targetRevenueMultiplier ?? 0);
      const exceededRevenueAmount = Number(exceededPolicy?.targetRevenueMultiplier ?? 0) > 0
        ? Math.max(Number(input.revenueAmount) - targetRevenue, 0)
        : Number(input.exceededRevenueAmount);
      const exceededCommissionAmount = exceededRevenueAmount * Number(exceededPolicy?.defaultRate ?? 0);
      const oneTimeCommissionAmount = Number(input.oneTimeJobRevenueAmount) * Number(oneTimePolicy?.defaultRate ?? 0);
      const newCustomerCommissionAmount = Number(input.newCustomerRevenueAmount) * Number(newCustomerPolicy?.defaultRate ?? 0);
      const commissionAmount = roundMoney(
        (employee.eligibleForCommission ? exceededCommissionAmount + oneTimeCommissionAmount + newCustomerCommissionAmount : 0),
      );
      const actualWorkdays = Number(input.actualWorkdays || standardWorkdays);
      const targetTimeSalaryAmount = roundMoney(Number(employee.baseSalary) * Math.min(actualWorkdays / Math.max(standardWorkdays, 1), 1));
      const taxableAllowanceAmount = allowances.taxable + overrides.taxable + Number(input.taxableAdjustmentAmount);
      const nonTaxableIncomeAmount = allowances.nonTaxable + overrides.nonTaxable + Number(input.nonTaxableAdjustmentAmount);
      const dependentCount = await getDependentCount(client, employee.id, period.periodEnd);
      const personalDeductionAmount = Number(taxPolicy?.personalDeductionAmount ?? 0);
      const dependentDeductionAmount = dependentCount * Number(taxPolicy?.dependentDeductionAmount ?? 0);
      const grossUpResult = calculateGrossAndNet({
        targetTimeSalaryAmount,
        salaryPaymentType: String(employee.salaryPaymentType),
        taxableAllowanceAmount,
        commissionAmount,
        nonTaxableIncomeAmount,
        participatesInsurance: Boolean(payrollSetting.participatesInsurance),
        insurancePolicy,
        personalDeductionAmount,
        dependentDeductionAmount,
        taxBrackets,
      });
      const timeSalaryAmount = grossUpResult.timeSalaryAmount;
      const grossUpSalaryAmount = grossUpResult.grossUpSalaryAmount;
      const taxableIncomeAmount = grossUpResult.taxableIncomeAmount;
      const grossSalaryAmount = grossUpResult.grossSalaryAmount;
      const insurance = grossUpResult.insurance;
      const totalDeductionAmount = roundMoney(personalDeductionAmount + dependentDeductionAmount + insurance.employeeAmount);
      const taxableAmount = grossUpResult.taxableAmount;
      const tax = grossUpResult.tax;
      const netSalaryAmount = roundMoney(grossSalaryAmount - insurance.employeeAmount - tax.taxAmount);
      const bankTransferAmount = roundMoney(netSalaryAmount - Number(input.advanceAmount) + Number(input.reimbursementAmount));
      const lineResult = await client.query<{ id: string }>(
        `
          insert into payroll_lines (
            payroll_period_id, employee_id, salary_payment_type, contract_type, base_salary,
            standard_workdays, actual_workdays, time_salary_amount, gross_up_salary_amount,
            non_taxable_income_amount, taxable_income_amount, allowance_bonus_amount,
            gross_salary_amount, personal_deduction_amount, dependent_count,
            dependent_deduction_amount, employee_insurance_amount, total_deduction_amount,
            taxable_amount, personal_income_tax_amount, net_salary_amount, advance_amount,
            reimbursement_amount, other_adjustment_amount, bank_transfer_amount,
            employer_insurance_amount, total_insurance_amount, status, snapshot_data
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, 'calculated', $28
          )
          returning id
        `,
        [
          id,
          employee.id,
          employee.salaryPaymentType,
          employee.contractType,
          employee.baseSalary,
          standardWorkdays,
          actualWorkdays,
          timeSalaryAmount,
          grossUpSalaryAmount,
          nonTaxableIncomeAmount,
          taxableIncomeAmount,
          taxableAllowanceAmount + nonTaxableIncomeAmount + commissionAmount,
          grossSalaryAmount,
          personalDeductionAmount,
          dependentCount,
          dependentDeductionAmount,
          insurance.employeeAmount,
          totalDeductionAmount,
          taxableAmount,
          tax.taxAmount,
          netSalaryAmount,
          input.advanceAmount,
          input.reimbursementAmount,
          input.taxableAdjustmentAmount + input.nonTaxableAdjustmentAmount,
          bankTransferAmount,
          insurance.employerAmount,
          insurance.employeeAmount + insurance.employerAmount,
          {
            payrollPolicy,
            taxPolicy,
            insurancePolicy,
            commissionPolicies: { exceededPolicy, oneTimePolicy, newCustomerPolicy },
            revenue,
            input,
          },
        ],
      );
      await insertPayrollDetails(client, lineResult.rows[0].id, {
        timeSalaryAmount,
        commissionAmount,
        taxableAllowanceAmount,
        nonTaxableIncomeAmount,
        tax,
        insurance,
      });
    }

    await client.query(
      "update payroll_periods set status = 'calculated', calculated_at = now(), updated_at = now() where id = $1",
      [id],
    );
    await client.query("commit");

    return payrollPeriodService.get(id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function transitionPayrollPeriod(id: string, action: "review" | "approve" | "lock" | "pay" | "cancel") {
  const transitions = {
    review: { from: ["calculated"], to: "reviewing", extra: "" },
    approve: { from: ["calculated", "reviewing"], to: "approved", extra: ", approved_at = now()" },
    lock: { from: ["approved"], to: "locked", extra: ", locked_at = now()" },
    pay: { from: ["locked"], to: "paid", extra: ", paid_at = now()" },
    cancel: { from: ["draft", "calculated", "reviewing"], to: "cancelled", extra: "" },
  }[action];
  const result = await db.query(
    `
      update payroll_periods
      set status = $2 ${transitions.extra}, updated_at = now()
      where id = $1 and deleted_at is null and status = any($3::payroll_period_status[])
      returning id
    `,
    [id, transitions.to, transitions.from],
  );

  if (!result.rows[0]) {
    throw new BadRequestError("Trạng thái kỳ lương không hợp lệ cho thao tác này");
  }

  await db.query(
    "update payroll_lines set status = $2, updated_at = now() where payroll_period_id = $1 and deleted_at is null",
    [id, transitions.to],
  );

  if (action === "lock") {
    await db.query(
      `
        insert into payroll_snapshots (payroll_period_id, snapshot_type, snapshot_data)
        select $1, 'period_lock', coalesce(jsonb_agg(to_jsonb(pl)), '[]'::jsonb)
        from payroll_lines pl
        where pl.payroll_period_id = $1 and pl.deleted_at is null
      `,
      [id],
    );
  }

  return payrollPeriodService.get(id);
}

async function assertPeriodEditable(id: string) {
  const result = await db.query<{ status: string }>(
    "select status from payroll_periods where id = $1 and deleted_at is null",
    [id],
  );
  const status = result.rows[0]?.status;

  if (!status) {
    throw new BadRequestError("Không tìm thấy kỳ lương");
  }

  if (["locked", "paid", "cancelled"].includes(status)) {
    throw new BadRequestError("Kỳ lương đã khóa, đã trả hoặc đã hủy không thể sửa input");
  }
}

async function getPeriodForUpdate(client: PoolClient, id: string) {
  const result = await client.query<{
    id: string;
    periodCode: string;
    periodStart: string;
    periodEnd: string;
    status: string;
    payrollPolicyVersionId: string | null;
    taxPolicyVersionId: string | null;
    insurancePolicyVersionId: string | null;
  }>(
    `
      select id, period_code as "periodCode", period_start as "periodStart", period_end as "periodEnd",
             status, payroll_policy_version_id as "payrollPolicyVersionId",
             tax_policy_version_id as "taxPolicyVersionId",
             insurance_policy_version_id as "insurancePolicyVersionId"
      from payroll_periods
      where id = $1 and deleted_at is null
      for update
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

async function getPayrollPolicy(client: PoolClient, period: Awaited<ReturnType<typeof getPeriodForUpdate>>) {
  if (!period) return null;
  const result = await client.query(
    `
      select id, code, name, standard_workdays as "standardWorkdays", gross_up_method as "grossUpMethod", config
      from payroll_policy_versions
      where deleted_at is null
        and status = 'active'
        and ($1::uuid is null or id = $1)
        and effective_from <= $2
        and (effective_to is null or effective_to >= $2)
      order by case when id = $1 then 0 else 1 end, effective_from desc
      limit 1
    `,
    [period.payrollPolicyVersionId, period.periodEnd],
  );

  return result.rows[0] ?? null;
}

async function getTaxPolicy(client: PoolClient, period: Awaited<ReturnType<typeof getPeriodForUpdate>>) {
  if (!period) return null;
  const result = await client.query(
    `
      select id, code, name, personal_deduction_amount as "personalDeductionAmount",
             dependent_deduction_amount as "dependentDeductionAmount", tax_method as "taxMethod"
      from tax_policy_versions
      where deleted_at is null
        and status = 'active'
        and ($1::uuid is null or id = $1)
        and effective_from <= $2
        and (effective_to is null or effective_to >= $2)
      order by case when id = $1 then 0 else 1 end, effective_from desc
      limit 1
    `,
    [period.taxPolicyVersionId, period.periodEnd],
  );

  return result.rows[0] ?? null;
}

async function getInsurancePolicy(client: PoolClient, period: Awaited<ReturnType<typeof getPeriodForUpdate>>) {
  if (!period) return null;
  const result = await client.query(
    `
      select id, code, name,
             employer_social_rate as "employerSocialRate",
             employer_health_rate as "employerHealthRate",
             employer_unemployment_rate as "employerUnemploymentRate",
             employer_union_rate as "employerUnionRate",
             employee_social_rate as "employeeSocialRate",
             employee_health_rate as "employeeHealthRate",
             employee_unemployment_rate as "employeeUnemploymentRate",
             min_insurance_base as "minInsuranceBase",
             max_insurance_base as "maxInsuranceBase"
      from insurance_policy_versions
      where deleted_at is null
        and status = 'active'
        and ($1::uuid is null or id = $1)
        and effective_from <= $2
        and (effective_to is null or effective_to >= $2)
      order by case when id = $1 then 0 else 1 end, effective_from desc
      limit 1
    `,
    [period.insurancePolicyVersionId, period.periodEnd],
  );

  return result.rows[0] ?? null;
}

async function getTaxBrackets(client: PoolClient, taxPolicyVersionId: string | null, periodEnd: string): Promise<TaxBracket[]> {
  const result = await client.query(
    `
      select tpb.bracket_order as "bracketOrder",
             tpb.from_amount as "fromAmount",
             tpb.to_amount as "toAmount",
             tpb.tax_rate as "taxRate",
             tpb.quick_deduction_amount as "quickDeductionAmount"
      from tax_policy_versions tpv
      join tax_policy_brackets tpb on tpb.tax_policy_version_id = tpv.id
      where tpv.deleted_at is null
        and tpv.status = 'active'
        and ($1::uuid is null or tpv.id = $1)
        and tpv.effective_from <= $2
        and (tpv.effective_to is null or tpv.effective_to >= $2)
      order by case when tpv.id = $1 then 0 else 1 end, tpv.effective_from desc, tpb.bracket_order asc
    `,
    [taxPolicyVersionId, periodEnd],
  );

  return result.rows.map((row) => ({
    bracketOrder: Number(row.bracketOrder),
    fromAmount: Number(row.fromAmount),
    toAmount: row.toAmount === null ? null : Number(row.toAmount),
    taxRate: Number(row.taxRate),
    quickDeductionAmount: Number(row.quickDeductionAmount),
  }));
}

async function getCommissionPolicies(client: PoolClient, periodEnd: string) {
  const result = await client.query(
    `
      select id, code, name, commission_type as "commissionType", department_id as "departmentId",
             job_level_id as "jobLevelId", contract_type as "contractType",
             salary_payment_type as "salaryPaymentType",
             target_revenue_multiplier as "targetRevenueMultiplier",
             default_rate as "defaultRate", min_rate as "minRate", max_rate as "maxRate"
      from commission_policies
      where deleted_at is null
        and status = 'active'
        and effective_from <= $1
        and (effective_to is null or effective_to >= $1)
      order by effective_from desc
    `,
    [periodEnd],
  );

  return result.rows;
}

async function getEmployeesForPayroll(client: PoolClient, periodStart: string, periodEnd: string) {
  const result = await client.query(
    `
      select
        e.id,
        e.department_id as "departmentId",
        e.job_level_id as "jobLevelId",
        ec.contract_type as "contractType",
        coalesce(eps.salary_payment_type, ec.salary_payment_type) as "salaryPaymentType",
        ec.base_salary as "baseSalary",
        ec.standard_workdays as "standardWorkdays",
        coalesce(eps.participates_insurance, true) as "participatesInsurance",
        coalesce(eps.eligible_for_commission, true) as "eligibleForCommission",
        coalesce(eps.eligible_for_exceeded_revenue_commission, true) as "eligibleForExceededRevenueCommission",
        coalesce(eps.eligible_for_one_time_customer_commission, true) as "eligibleForOneTimeCustomerCommission",
        coalesce(eps.eligible_for_new_customer_commission, true) as "eligibleForNewCustomerCommission"
      from employees e
      join lateral (
        select *
        from employee_contracts ec
        where ec.employee_id = e.id and ec.deleted_at is null
          and ec.effective_from <= $2
          and (ec.effective_to is null or ec.effective_to >= $1)
        order by ec.effective_from desc
        limit 1
      ) ec on true
      left join lateral (
        select *
        from employee_payroll_settings eps
        where eps.employee_id = e.id and eps.deleted_at is null
          and eps.effective_from <= $2
          and (eps.effective_to is null or eps.effective_to >= $1)
        order by eps.effective_from desc
        limit 1
      ) eps on true
      where e.deleted_at is null
        and e.status in ('active', 'probation')
      order by e.employee_code asc
    `,
    [periodStart, periodEnd],
  );

  return result.rows;
}

async function getEmployeeRevenue(client: PoolClient, employeeId: string, periodStart: string, periodEnd: string) {
  const result = await client.query(
    `
      select
        coalesce(sum(o.net_revenue_amount), 0) as "revenueAmount",
        coalesce(sum(o.net_revenue_amount) filter (where o.order_type = 'one_time'), 0) as "oneTimeJobRevenueAmount",
        0::numeric as "newCustomerRevenueAmount"
      from orders o
      where o.deleted_at is null
        and o.status not in ('draft', 'cancelled')
        and o.commission_employee_id = $1
        and o.document_date between $2 and $3
    `,
    [employeeId, periodStart, periodEnd],
  );

  return {
    revenueAmount: Number(result.rows[0]?.revenueAmount ?? 0),
    oneTimeJobRevenueAmount: Number(result.rows[0]?.oneTimeJobRevenueAmount ?? 0),
    newCustomerRevenueAmount: Number(result.rows[0]?.newCustomerRevenueAmount ?? 0),
  };
}

async function upsertPayrollInput(
  client: PoolClient,
  payrollPeriodId: string,
  employeeId: string,
  standardWorkdays: number,
  revenue: { revenueAmount: number; oneTimeJobRevenueAmount: number; newCustomerRevenueAmount: number },
) {
  const result = await client.query<{ id: string }>(
    `
      insert into payroll_inputs (
        payroll_period_id, employee_id, actual_workdays,
        revenue_amount, one_time_job_revenue_amount, new_customer_revenue_amount
      )
      values ($1, $2, $3, $4, $5, $6)
      on conflict (payroll_period_id, employee_id)
      do update set
        revenue_amount = excluded.revenue_amount,
        one_time_job_revenue_amount = excluded.one_time_job_revenue_amount,
        new_customer_revenue_amount = excluded.new_customer_revenue_amount,
        updated_at = now()
      returning id
    `,
    [payrollPeriodId, employeeId, standardWorkdays, revenue.revenueAmount, revenue.oneTimeJobRevenueAmount, revenue.newCustomerRevenueAmount],
  );

  return result.rows[0].id;
}

async function getPayrollInput(client: PoolClient, id: string) {
  const result = await client.query(
    `
      select actual_workdays as "actualWorkdays", revenue_amount as "revenueAmount",
             exceeded_revenue_amount as "exceededRevenueAmount",
             one_time_job_revenue_amount as "oneTimeJobRevenueAmount",
             new_customer_revenue_amount as "newCustomerRevenueAmount",
             advance_amount as "advanceAmount", reimbursement_amount as "reimbursementAmount",
             taxable_adjustment_amount as "taxableAdjustmentAmount",
             non_taxable_adjustment_amount as "nonTaxableAdjustmentAmount"
      from payroll_inputs
      where id = $1
    `,
    [id],
  );

  return result.rows[0];
}

async function getEmployeeAllowances(client: PoolClient, employee: Record<string, unknown>, periodEnd: string) {
  const result = await client.query(
    `
      select coalesce(sum(amount) filter (where taxability = 'taxable'), 0) as taxable,
             coalesce(sum(amount) filter (where taxability = 'non_taxable'), 0) as "nonTaxable"
      from allowance_policies
      where deleted_at is null
        and status = 'active'
        and effective_from <= $1
        and (effective_to is null or effective_to >= $1)
        and (department_id is null or department_id = $2)
        and (job_level_id is null or job_level_id = $3)
        and (contract_type is null or contract_type = $4)
        and (salary_payment_type is null or salary_payment_type = $5)
    `,
    [periodEnd, employee.departmentId, employee.jobLevelId, employee.contractType, employee.salaryPaymentType],
  );

  return {
    taxable: Number(result.rows[0]?.taxable ?? 0),
    nonTaxable: Number(result.rows[0]?.nonTaxable ?? 0),
  };
}

async function getEmployeeOverrides(client: PoolClient, employeeId: string, periodEnd: string) {
  const result = await client.query(
    `
      select coalesce(sum(epo.amount) filter (where it.taxability = 'taxable'), 0) as taxable,
             coalesce(sum(epo.amount) filter (where it.taxability = 'non_taxable'), 0) as "nonTaxable"
      from employee_policy_overrides epo
      left join income_types it on it.id = epo.income_type_id
      where epo.employee_id = $1
        and epo.deleted_at is null
        and epo.approved_at is not null
        and epo.amount is not null
        and epo.effective_from <= $2
        and (epo.effective_to is null or epo.effective_to >= $2)
    `,
    [employeeId, periodEnd],
  );

  return {
    taxable: Number(result.rows[0]?.taxable ?? 0),
    nonTaxable: Number(result.rows[0]?.nonTaxable ?? 0),
  };
}

async function getDependentCount(client: PoolClient, employeeId: string, periodEnd: string) {
  const result = await client.query<{ total: string }>(
    `
      select count(*)::text as total
      from employee_dependents
      where employee_id = $1
        and deleted_at is null
        and effective_from <= $2
        and (effective_to is null or effective_to >= $2)
    `,
    [employeeId, periodEnd],
  );

  return Number(result.rows[0]?.total ?? 0);
}

function pickCommissionPolicy(policies: Record<string, unknown>[], type: string, employee: Record<string, unknown>) {
  return policies.find((policy) =>
    String(policy.commissionType) === type &&
    (!policy.departmentId || policy.departmentId === employee.departmentId) &&
    (!policy.jobLevelId || policy.jobLevelId === employee.jobLevelId) &&
    (!policy.contractType || policy.contractType === employee.contractType) &&
    (!policy.salaryPaymentType || policy.salaryPaymentType === employee.salaryPaymentType),
  );
}

function calculateInsurance(baseSalary: number, participatesInsurance: boolean, policy: Record<string, unknown> | null) {
  if (!participatesInsurance || !policy) {
    return { baseAmount: 0, employeeAmount: 0, employerAmount: 0 };
  }

  const baseAmount = clampInsuranceBase(
    baseSalary,
    policy.minInsuranceBase === null ? null : Number(policy.minInsuranceBase),
    policy.maxInsuranceBase === null ? null : Number(policy.maxInsuranceBase),
  );
  const employeeRate = Number(policy.employeeSocialRate ?? 0) + Number(policy.employeeHealthRate ?? 0) + Number(policy.employeeUnemploymentRate ?? 0);
  const employerRate = Number(policy.employerSocialRate ?? 0) + Number(policy.employerHealthRate ?? 0) + Number(policy.employerUnemploymentRate ?? 0) + Number(policy.employerUnionRate ?? 0);

  return {
    baseAmount,
    employeeAmount: roundMoney(baseAmount * employeeRate),
    employerAmount: roundMoney(baseAmount * employerRate),
  };
}

function calculateGrossAndNet(input: {
  targetTimeSalaryAmount: number;
  salaryPaymentType: string;
  taxableAllowanceAmount: number;
  commissionAmount: number;
  nonTaxableIncomeAmount: number;
  participatesInsurance: boolean;
  insurancePolicy: Record<string, unknown> | null;
  personalDeductionAmount: number;
  dependentDeductionAmount: number;
  taxBrackets: TaxBracket[];
}) {
  if (input.salaryPaymentType !== "net") {
    const taxableIncomeAmount = roundMoney(input.targetTimeSalaryAmount + input.taxableAllowanceAmount + input.commissionAmount);
    const insurance = calculateInsurance(input.targetTimeSalaryAmount, input.participatesInsurance, input.insurancePolicy);
    const taxableAmount = Math.max(
      roundMoney(taxableIncomeAmount - input.personalDeductionAmount - input.dependentDeductionAmount - insurance.employeeAmount),
      0,
    );
    const tax = calculateProgressiveTax(taxableAmount, input.taxBrackets);

    return {
      timeSalaryAmount: input.targetTimeSalaryAmount,
      grossUpSalaryAmount: 0,
      taxableIncomeAmount,
      grossSalaryAmount: roundMoney(taxableIncomeAmount + input.nonTaxableIncomeAmount),
      insurance,
      taxableAmount,
      tax,
    };
  }

  const targetNetAmount = roundMoney(
    input.targetTimeSalaryAmount +
      input.taxableAllowanceAmount +
      input.commissionAmount +
      input.nonTaxableIncomeAmount,
  );
  let timeSalaryAmount = input.targetTimeSalaryAmount;
  let result = calculateGrossCandidate(input, timeSalaryAmount);

  for (let index = 0; index < 24; index += 1) {
    const diff = roundMoney(targetNetAmount - result.netSalaryAmount);

    if (Math.abs(diff) < 1) {
      break;
    }

    timeSalaryAmount = Math.max(0, roundMoney(timeSalaryAmount + diff));
    result = calculateGrossCandidate(input, timeSalaryAmount);
  }

  return {
    timeSalaryAmount,
    grossUpSalaryAmount: roundMoney(timeSalaryAmount - input.targetTimeSalaryAmount),
    taxableIncomeAmount: result.taxableIncomeAmount,
    grossSalaryAmount: result.grossSalaryAmount,
    insurance: result.insurance,
    taxableAmount: result.taxableAmount,
    tax: result.tax,
  };
}

function calculateGrossCandidate(
  input: Parameters<typeof calculateGrossAndNet>[0],
  timeSalaryAmount: number,
) {
  const taxableIncomeAmount = roundMoney(timeSalaryAmount + input.taxableAllowanceAmount + input.commissionAmount);
  const insurance = calculateInsurance(timeSalaryAmount, input.participatesInsurance, input.insurancePolicy);
  const taxableAmount = Math.max(
    roundMoney(taxableIncomeAmount - input.personalDeductionAmount - input.dependentDeductionAmount - insurance.employeeAmount),
    0,
  );
  const tax = calculateProgressiveTax(taxableAmount, input.taxBrackets);
  const grossSalaryAmount = roundMoney(taxableIncomeAmount + input.nonTaxableIncomeAmount);

  return {
    taxableIncomeAmount,
    grossSalaryAmount,
    insurance,
    taxableAmount,
    tax,
    netSalaryAmount: roundMoney(grossSalaryAmount - insurance.employeeAmount - tax.taxAmount),
  };
}

async function ensureSystemPayrollTypes(client: PoolClient) {
  await client.query(`
    insert into income_types (code, name, taxability, is_system, is_active)
    values
      ('BASE_SALARY', 'Lương thời gian', 'taxable', true, true),
      ('COMMISSION', 'Hoa hồng', 'taxable', true, true),
      ('TAXABLE_ALLOWANCE', 'Phụ cấp chịu thuế', 'taxable', true, true),
      ('NON_TAXABLE_ALLOWANCE', 'Phụ cấp miễn thuế', 'non_taxable', true, true)
    on conflict (code) do nothing
  `);
}

async function insertPayrollDetails(
  client: PoolClient,
  payrollLineId: string,
  data: {
    timeSalaryAmount: number;
    commissionAmount: number;
    taxableAllowanceAmount: number;
    nonTaxableIncomeAmount: number;
    tax: ReturnType<typeof calculateProgressiveTax>;
    insurance: { baseAmount: number; employeeAmount: number; employerAmount: number };
  },
) {
  const incomeTypes = await client.query<{ id: string; code: string }>(
    "select id, code from income_types where code = any($1::text[])",
    [["BASE_SALARY", "COMMISSION", "TAXABLE_ALLOWANCE", "NON_TAXABLE_ALLOWANCE"]],
  );
  const byCode = new Map(incomeTypes.rows.map((row) => [row.code, row.id]));
  const incomeRows = [
    ["BASE_SALARY", "Lương thời gian", "taxable", data.timeSalaryAmount],
    ["COMMISSION", "Hoa hồng", "taxable", data.commissionAmount],
    ["TAXABLE_ALLOWANCE", "Phụ cấp/thưởng chịu thuế", "taxable", data.taxableAllowanceAmount],
    ["NON_TAXABLE_ALLOWANCE", "Phụ cấp miễn thuế", "non_taxable", data.nonTaxableIncomeAmount],
  ];

  for (const [code, description, taxability, amount] of incomeRows) {
    if (Number(amount) <= 0 || !byCode.get(String(code))) continue;
    await client.query(
      `
        insert into payroll_income_lines (payroll_line_id, income_type_id, description, taxability, amount)
        values ($1, $2, $3, $4, $5)
      `,
      [payrollLineId, byCode.get(String(code)), description, taxability, amount],
    );
  }

  for (const [insuranceType, paidBy, amount] of [
    ["social_health_unemployment", "employee", data.insurance.employeeAmount],
    ["social_health_unemployment_union", "employer", data.insurance.employerAmount],
  ]) {
    if (Number(amount) <= 0) continue;
    await client.query(
      `
        insert into payroll_insurance_lines (payroll_line_id, insurance_type, paid_by, rate, base_amount, amount)
        values ($1, $2, $3, 0, $4, $5)
      `,
      [payrollLineId, insuranceType, paidBy, data.insurance.baseAmount, amount],
    );
  }

  for (const taxLine of data.tax.lines) {
    await client.query(
      `
        insert into payroll_tax_lines (
          payroll_line_id, bracket_order, from_amount, to_amount,
          taxable_amount, tax_rate, tax_amount
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        payrollLineId,
        taxLine.bracketOrder,
        taxLine.fromAmount,
        taxLine.toAmount,
        taxLine.taxableAmount,
        taxLine.taxRate,
        taxLine.taxAmount,
      ],
    );
  }
}
