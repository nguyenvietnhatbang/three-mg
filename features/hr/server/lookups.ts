import { db } from "@/lib/db";

export async function getHrLookups() {
  const [departments, jobLevels, employees] = await Promise.all([
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
  ]);

  return {
    departments: departments.rows,
    jobLevels: jobLevels.rows,
    employees: employees.rows,
  };
}
