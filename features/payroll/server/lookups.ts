import { db } from "@/lib/db";

export async function getPayrollLookups() {
  const [periods, payrollPolicies, taxPolicies, insurancePolicies] = await Promise.all([
    db.query(`
      select id, period_code as code, concat(period_start, ' - ', period_end) as name
      from payroll_periods
      where deleted_at is null
      order by period_start desc
      limit 300
    `),
    db.query(`
      select id, code, name
      from payroll_policy_versions
      where deleted_at is null
      order by effective_from desc
      limit 300
    `),
    db.query(`
      select id, code, name
      from tax_policy_versions
      where deleted_at is null
      order by effective_from desc
      limit 300
    `),
    db.query(`
      select id, code, name
      from insurance_policy_versions
      where deleted_at is null
      order by effective_from desc
      limit 300
    `),
  ]);

  return {
    payrollPeriods: periods.rows,
    payrollPolicies: payrollPolicies.rows,
    taxPolicies: taxPolicies.rows,
    insurancePolicies: insurancePolicies.rows,
  };
}
