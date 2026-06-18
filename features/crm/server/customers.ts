import { db } from "@/lib/db";
import {
  getOffset,
  getPagination,
  getSortClause,
  likeSearch,
  type ListQuery,
} from "@/features/shared/server/query";
import {
  customerInputSchema,
  customerPatchSchema,
  customerStatusSchema,
} from "./validators";

const customerSortColumns = {
  customerCode: "c.customer_code",
  companyName: "c.company_name",
  taxCode: "c.tax_code",
  status: "c.status",
  createdAt: "c.created_at",
} satisfies Record<string, string>;

const customerSelect = `
  c.id,
  c.customer_code as "customerCode",
  c.company_name as "companyName",
  c.short_name as "shortName",
  c.tax_code as "taxCode",
  c.address,
  c.email,
  c.phone,
  c.representative_name as "representativeName",
  c.representative_title as "representativeTitle",
  c.accounting_software as "accountingSoftware",
  c.accounting_software_url as "accountingSoftwareUrl",
  c.assigned_employee_id as "assignedEmployeeId",
  e.full_name as "assignedEmployeeName",
  c.default_legal_entity_id as "defaultLegalEntityId",
  le.name as "defaultLegalEntityName",
  c.status,
  c.notes,
  c.created_at as "createdAt",
  c.updated_at as "updatedAt"
`;

export type CustomerFilters = {
  status?: string | null;
  assignedEmployeeId?: string | null;
};

export async function listCustomers(query: ListQuery, filters: CustomerFilters) {
  const values: unknown[] = [];
  const where = ["c.deleted_at is null"];

  if (query.search) {
    values.push(likeSearch(query.search));
    where.push(`(
      c.customer_code ilike $${values.length}
      or c.company_name ilike $${values.length}
      or c.short_name ilike $${values.length}
      or c.tax_code ilike $${values.length}
      or c.email ilike $${values.length}
      or c.phone ilike $${values.length}
    )`);
  }

  if (filters.status) {
    customerStatusSchema.parse(filters.status);
    values.push(filters.status);
    where.push(`c.status = $${values.length}`);
  }

  if (filters.assignedEmployeeId) {
    values.push(filters.assignedEmployeeId);
    where.push(`c.assigned_employee_id = $${values.length}`);
  }

  const whereSql = where.join(" and ");
  const totalResult = await db.query<{ total: string }>(
    `select count(*)::text as total from customers c where ${whereSql}`,
    values,
  );
  const total = Number(totalResult.rows[0]?.total ?? 0);
  const pagination = getPagination(query.page, query.pageSize, total);

  values.push(query.pageSize, getOffset(query.page, query.pageSize));
  const sortClause = getSortClause(
    query.sortBy,
    query.sortOrder,
    customerSortColumns,
    "c.created_at",
  );

  const result = await db.query(
    `
      select ${customerSelect}
      from customers c
      left join employees e on e.id = c.assigned_employee_id
      left join legal_entities le on le.id = c.default_legal_entity_id
      where ${whereSql}
      order by ${sortClause}
      limit $${values.length - 1} offset $${values.length}
    `,
    values,
  );

  return { rows: result.rows, pagination };
}

export async function getCustomer(id: string) {
  const result = await db.query(
    `
      select ${customerSelect}
      from customers c
      left join employees e on e.id = c.assigned_employee_id
      left join legal_entities le on le.id = c.default_legal_entity_id
      where c.id = $1 and c.deleted_at is null
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function createCustomer(input: unknown) {
  const data = customerInputSchema.parse(input);
  const result = await db.query(
    `
      insert into customers (
        customer_code,
        company_name,
        short_name,
        tax_code,
        address,
        email,
        phone,
        representative_name,
        representative_title,
        accounting_software,
        accounting_software_url,
        assigned_employee_id,
        default_legal_entity_id,
        status,
        notes
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      returning id
    `,
    [
      data.customerCode,
      data.companyName,
      data.shortName ?? null,
      data.taxCode ?? null,
      data.address ?? null,
      data.email ?? null,
      data.phone ?? null,
      data.representativeName ?? null,
      data.representativeTitle ?? null,
      data.accountingSoftware ?? null,
      data.accountingSoftwareUrl ?? null,
      data.assignedEmployeeId ?? null,
      data.defaultLegalEntityId ?? null,
      data.status,
      data.notes ?? null,
    ],
  );

  return getCustomer(result.rows[0].id);
}

export async function updateCustomer(id: string, input: unknown) {
  const data = customerPatchSchema.parse(input);
  const fieldMap: Record<string, string> = {
    customerCode: "customer_code",
    companyName: "company_name",
    shortName: "short_name",
    taxCode: "tax_code",
    address: "address",
    email: "email",
    phone: "phone",
    representativeName: "representative_name",
    representativeTitle: "representative_title",
    accountingSoftware: "accounting_software",
    accountingSoftwareUrl: "accounting_software_url",
    assignedEmployeeId: "assigned_employee_id",
    defaultLegalEntityId: "default_legal_entity_id",
    status: "status",
    notes: "notes",
  };
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return getCustomer(id);
  }

  const values: unknown[] = [];
  const assignments = entries.map(([key, value]) => {
    values.push(value);
    return `${fieldMap[key]} = $${values.length}`;
  });

  values.push(id);
  await db.query(
    `
      update customers
      set ${assignments.join(", ")}
      where id = $${values.length} and deleted_at is null
    `,
    values,
  );

  return getCustomer(id);
}

export async function deleteCustomer(id: string) {
  const result = await db.query(
    `
      update customers
      set deleted_at = now()
      where id = $1 and deleted_at is null
      returning id
    `,
    [id],
  );

  return Number(result.rowCount ?? 0) > 0;
}
