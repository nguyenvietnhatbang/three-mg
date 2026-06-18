import { db } from "@/lib/db";

export async function getHrLookups() {
  const [departments, jobLevels, employees, leaveTypes, incomeTypes, deductionTypes] = await Promise.all([
    db.query(`
      select id, code, name
      from departments
      where deleted_at is null
      order by name asc
      limit 500
    `),
    db.query(`
      select id, code, name
      from job_levels
      where deleted_at is null
      order by rank_order asc, name asc
      limit 500
    `),
    db.query(`
      select id, employee_code as "code", full_name as "name"
      from employees
      where deleted_at is null
      order by full_name asc
      limit 500
    `),
    db.query(`
      select id, code, name
      from leave_types
      where deleted_at is null
      order by name asc
      limit 200
    `),
    db.query(`
      select id, code, name
      from income_types
      where deleted_at is null and is_active = true
      order by name asc
      limit 200
    `),
    db.query(`
      select id, code, name
      from deduction_types
      where deleted_at is null and is_active = true
      order by name asc
      limit 200
    `),
  ]);

  return {
    departments: departments.rows,
    jobLevels: jobLevels.rows,
    employees: employees.rows,
    leaveTypes: leaveTypes.rows,
    incomeTypes: incomeTypes.rows,
    deductionTypes: deductionTypes.rows,
  };
}
