import { db } from "@/lib/db";
import {
  getOffset,
  getPagination,
  getSortClause,
  likeSearch,
  type ListQuery,
} from "@/features/shared/server/query";
import { departmentInputSchema, departmentPatchSchema } from "./validators";

const departmentSortColumns = {
  code: "d.code",
  name: "d.name",
  parentDepartmentName: "pd.name",
  managerEmployeeName: "e.full_name",
  createdAt: "d.created_at",
} satisfies Record<string, string>;

const departmentSelect = `
  d.id,
  d.code,
  d.name,
  d.parent_department_id as "parentDepartmentId",
  pd.name as "parentDepartmentName",
  d.manager_employee_id as "managerEmployeeId",
  e.full_name as "managerEmployeeName",
  d.description,
  d.created_at as "createdAt",
  d.updated_at as "updatedAt"
`;

export async function listDepartments(query: ListQuery) {
  const values: unknown[] = [];
  const where = ["d.deleted_at is null"];

  if (query.search) {
    values.push(likeSearch(query.search));
    where.push(`(d.code ilike $${values.length} or d.name ilike $${values.length})`);
  }

  const whereSql = where.join(" and ");
  const joinSql = `
    from departments d
    left join departments pd on pd.id = d.parent_department_id
    left join employees e on e.id = d.manager_employee_id
  `;
  const totalResult = await db.query<{ total: string }>(
    `select count(*)::text as total from departments d where ${whereSql}`,
    values,
  );
  const total = Number(totalResult.rows[0]?.total ?? 0);
  const pagination = getPagination(query.page, query.pageSize, total);
  values.push(query.pageSize, getOffset(query.page, query.pageSize));
  const sortClause = getSortClause(
    query.sortBy,
    query.sortOrder,
    departmentSortColumns,
    "d.created_at",
  );

  const result = await db.query(
    `
      select ${departmentSelect}
      ${joinSql}
      where ${whereSql}
      order by ${sortClause}
      limit $${values.length - 1} offset $${values.length}
    `,
    values,
  );

  return { rows: result.rows, pagination };
}

export async function getDepartment(id: string) {
  const result = await db.query(
    `
      select ${departmentSelect}
      from departments d
      left join departments pd on pd.id = d.parent_department_id
      left join employees e on e.id = d.manager_employee_id
      where d.id = $1 and d.deleted_at is null
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function createDepartment(input: unknown) {
  const data = departmentInputSchema.parse(input);
  const result = await db.query(
    `
      insert into departments (code, name, parent_department_id, manager_employee_id, description)
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [
      data.code,
      data.name,
      data.parentDepartmentId ?? null,
      data.managerEmployeeId ?? null,
      data.description ?? null,
    ],
  );

  return getDepartment(result.rows[0].id);
}

export async function updateDepartment(id: string, input: unknown) {
  const data = departmentPatchSchema.parse(input);
  const fieldMap: Record<string, string> = {
    code: "code",
    name: "name",
    parentDepartmentId: "parent_department_id",
    managerEmployeeId: "manager_employee_id",
    description: "description",
  };
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return getDepartment(id);
  }

  const values: unknown[] = [];
  const assignments = entries.map(([key, value]) => {
    values.push(value);
    return `${fieldMap[key]} = $${values.length}`;
  });
  values.push(id);
  await db.query(
    `update departments set ${assignments.join(", ")} where id = $${values.length} and deleted_at is null`,
    values,
  );

  return getDepartment(id);
}

export async function deleteDepartment(id: string) {
  const result = await db.query(
    `
      update departments
      set deleted_at = now()
      where id = $1 and deleted_at is null
      returning id
    `,
    [id],
  );

  return Number(result.rowCount ?? 0) > 0;
}

