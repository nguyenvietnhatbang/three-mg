import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getOffset,
  getPagination,
  getSortClause,
  likeSearch,
  type ListQuery,
} from "@/features/shared/server/query";
import {
  contractTypeSchema,
  employeeInputSchema,
  employeePatchSchema,
  employeeStatusSchema,
  salaryPaymentTypeSchema,
} from "./validators";

type Queryable = Pool | PoolClient;

const uuidFilterSchema = z.string().uuid();

const employeeSortColumns = {
  employeeCode: "e.employee_code",
  fullName: "e.full_name",
  departmentName: "d.name",
  jobLevelName: "jl.name",
  contractType: "ec.contract_type",
  salaryPaymentType: "ec.salary_payment_type",
  baseSalary: "ec.base_salary",
  status: "e.status",
  hireDate: "e.hire_date",
  createdAt: "e.created_at",
} satisfies Record<string, string>;

const employeeSelect = `
  e.id,
  e.employee_code as "employeeCode",
  e.full_name as "fullName",
  e.short_name as "shortName",
  e.department_id as "departmentId",
  d.name as "departmentName",
  e.job_level_id as "jobLevelId",
  jl.name as "jobLevelName",
  e.work_email as "workEmail",
  e.personal_email as "personalEmail",
  e.phone,
  e.status,
  e.hire_date as "hireDate",
  e.termination_date as "terminationDate",
  e.bank_name as "bankName",
  e.bank_account_number as "bankAccountNumber",
  e.bank_account_name as "bankAccountName",
  e.notes,
  ec.id as "currentContractId",
  ec.contract_type as "contractType",
  ec.salary_payment_type as "salaryPaymentType",
  ec.base_salary as "baseSalary",
  ec.standard_workdays as "standardWorkdays",
  ec.effective_from as "contractEffectiveFrom",
  ec.effective_to as "contractEffectiveTo",
  e.created_at as "createdAt",
  e.updated_at as "updatedAt"
`;

const employeeJoinSql = `
  from employees e
  left join departments d on d.id = e.department_id
  left join job_levels jl on jl.id = e.job_level_id
  left join lateral (
    select current_contract.*
    from employee_contracts current_contract
    where current_contract.employee_id = e.id
      and current_contract.deleted_at is null
    order by current_contract.effective_from desc, current_contract.created_at desc
    limit 1
  ) ec on true
`;

export type EmployeeFilters = {
  status?: string | null;
  departmentId?: string | null;
  jobLevelId?: string | null;
  contractType?: string | null;
  salaryPaymentType?: string | null;
};

export async function listEmployees(query: ListQuery, filters: EmployeeFilters) {
  const values: unknown[] = [];
  const where = ["e.deleted_at is null"];

  if (query.search) {
    values.push(likeSearch(query.search));
    where.push(`(
      e.employee_code ilike $${values.length}
      or e.full_name ilike $${values.length}
      or e.short_name ilike $${values.length}
      or e.work_email ilike $${values.length}
      or e.phone ilike $${values.length}
    )`);
  }

  if (filters.status) {
    employeeStatusSchema.parse(filters.status);
    values.push(filters.status);
    where.push(`e.status = $${values.length}`);
  }

  if (filters.departmentId) {
    uuidFilterSchema.parse(filters.departmentId);
    values.push(filters.departmentId);
    where.push(`e.department_id = $${values.length}`);
  }

  if (filters.jobLevelId) {
    uuidFilterSchema.parse(filters.jobLevelId);
    values.push(filters.jobLevelId);
    where.push(`e.job_level_id = $${values.length}`);
  }

  if (filters.contractType) {
    contractTypeSchema.parse(filters.contractType);
    values.push(filters.contractType);
    where.push(`ec.contract_type = $${values.length}`);
  }

  if (filters.salaryPaymentType) {
    salaryPaymentTypeSchema.parse(filters.salaryPaymentType);
    values.push(filters.salaryPaymentType);
    where.push(`ec.salary_payment_type = $${values.length}`);
  }

  const whereSql = where.join(" and ");
  const totalResult = await db.query<{ total: string }>(
    `select count(*)::text as total ${employeeJoinSql} where ${whereSql}`,
    values,
  );
  const total = Number(totalResult.rows[0]?.total ?? 0);
  const pagination = getPagination(query.page, query.pageSize, total);
  values.push(query.pageSize, getOffset(query.page, query.pageSize));
  const sortClause = getSortClause(
    query.sortBy,
    query.sortOrder,
    employeeSortColumns,
    "e.created_at",
  );

  const result = await db.query(
    `
      select ${employeeSelect}
      ${employeeJoinSql}
      where ${whereSql}
      order by ${sortClause}
      limit $${values.length - 1} offset $${values.length}
    `,
    values,
  );

  return { rows: result.rows, pagination };
}

export async function getEmployee(id: string, queryable: Queryable = db) {
  const result = await queryable.query(
    `
      select ${employeeSelect}
      ${employeeJoinSql}
      where e.id = $1 and e.deleted_at is null
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function createEmployee(input: unknown) {
  const data = employeeInputSchema.parse(input);
  const client = await db.connect();

  try {
    await client.query("begin");
    const employeeResult = await client.query<{ id: string }>(
      `
        insert into employees (
          employee_code,
          full_name,
          short_name,
          department_id,
          job_level_id,
          work_email,
          personal_email,
          phone,
          status,
          hire_date,
          termination_date,
          bank_name,
          bank_account_number,
          bank_account_name,
          notes
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15
        )
        returning id
      `,
      [
        data.employeeCode,
        data.fullName,
        data.shortName ?? null,
        data.departmentId ?? null,
        data.jobLevelId ?? null,
        data.workEmail ?? null,
        data.personalEmail ?? null,
        data.phone ?? null,
        data.status,
        data.hireDate ?? null,
        data.terminationDate ?? null,
        data.bankName ?? null,
        data.bankAccountNumber ?? null,
        data.bankAccountName ?? null,
        data.notes ?? null,
      ],
    );
    const employeeId = employeeResult.rows[0].id;

    await client.query(
      `
        insert into employee_contracts (
          employee_id,
          contract_type,
          salary_payment_type,
          base_salary,
          standard_workdays,
          effective_from,
          effective_to
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        employeeId,
        data.contractType,
        data.salaryPaymentType,
        data.baseSalary,
        data.standardWorkdays ?? null,
        data.contractEffectiveFrom ?? todayIsoDate(),
        data.contractEffectiveTo ?? null,
      ],
    );

    const employee = await getEmployee(employeeId, client);
    await client.query("commit");

    return employee;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateEmployee(id: string, input: unknown) {
  const data = employeePatchSchema.parse(input);
  const client = await db.connect();

  try {
    await client.query("begin");
    const existingEmployee = await getEmployee(id, client);

    if (!existingEmployee) {
      await client.query("commit");
      return null;
    }

    const employeeEntries = Object.entries(data).filter(
      ([key, value]) => employeeFieldMap[key] && value !== undefined,
    );

    if (employeeEntries.length > 0) {
      const values: unknown[] = [];
      const assignments = employeeEntries.map(([key, value]) => {
        values.push(value);
        return `${employeeFieldMap[key]} = $${values.length}`;
      });
      values.push(id);
      await client.query(
        `
          update employees
          set ${assignments.join(", ")}
          where id = $${values.length} and deleted_at is null
        `,
        values,
      );
    }

    if (hasContractChanges(data)) {
      await upsertCurrentContract(client, id, data);
    }

    const employee = await getEmployee(id, client);
    await client.query("commit");

    return employee;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteEmployee(id: string) {
  const result = await db.query(
    `
      update employees
      set deleted_at = now()
      where id = $1 and deleted_at is null
      returning id
    `,
    [id],
  );

  return Number(result.rowCount ?? 0) > 0;
}

const employeeFieldMap: Record<string, string> = {
  employeeCode: "employee_code",
  fullName: "full_name",
  shortName: "short_name",
  departmentId: "department_id",
  jobLevelId: "job_level_id",
  workEmail: "work_email",
  personalEmail: "personal_email",
  phone: "phone",
  status: "status",
  hireDate: "hire_date",
  terminationDate: "termination_date",
  bankName: "bank_name",
  bankAccountNumber: "bank_account_number",
  bankAccountName: "bank_account_name",
  notes: "notes",
};

const contractFieldMap: Record<string, string> = {
  contractType: "contract_type",
  salaryPaymentType: "salary_payment_type",
  baseSalary: "base_salary",
  standardWorkdays: "standard_workdays",
  contractEffectiveFrom: "effective_from",
  contractEffectiveTo: "effective_to",
};

async function upsertCurrentContract(
  client: PoolClient,
  employeeId: string,
  data: Partial<z.infer<typeof employeeInputSchema>>,
) {
  const currentResult = await client.query<{ id: string }>(
    `
      select id
      from employee_contracts
      where employee_id = $1 and deleted_at is null
      order by effective_from desc, created_at desc
      limit 1
    `,
    [employeeId],
  );
  const currentId = currentResult.rows[0]?.id;

  if (currentId) {
    const entries = Object.entries(data).filter(
      ([key, value]) => contractFieldMap[key] && value !== undefined,
    );

    if (entries.length === 0) {
      return;
    }

    const values: unknown[] = [];
    const assignments = entries.map(([key, value]) => {
      values.push(value);
      return `${contractFieldMap[key]} = $${values.length}`;
    });
    values.push(currentId);
    await client.query(
      `
        update employee_contracts
        set ${assignments.join(", ")}
        where id = $${values.length} and deleted_at is null
      `,
      values,
    );
    return;
  }

  await client.query(
    `
      insert into employee_contracts (
        employee_id,
        contract_type,
        salary_payment_type,
        base_salary,
        standard_workdays,
        effective_from,
        effective_to
      )
      values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      employeeId,
      data.contractType ?? "full_time",
      data.salaryPaymentType ?? "gross",
      data.baseSalary ?? 0,
      data.standardWorkdays ?? null,
      data.contractEffectiveFrom ?? todayIsoDate(),
      data.contractEffectiveTo ?? null,
    ],
  );
}

function hasContractChanges(data: Partial<z.infer<typeof employeeInputSchema>>) {
  const payload = data as Record<string, unknown>;

  return Object.keys(contractFieldMap).some((key) => payload[key] !== undefined);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
