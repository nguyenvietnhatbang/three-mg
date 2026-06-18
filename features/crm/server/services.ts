import { db } from "@/lib/db";
import {
  getOffset,
  getPagination,
  getSortClause,
  likeSearch,
  type ListQuery,
} from "@/features/shared/server/query";
import { serviceInputSchema, servicePatchSchema } from "./validators";

const serviceSortColumns = {
  serviceCode: "s.service_code",
  name: "s.name",
  serviceType: "s.service_type",
  standardUnitPrice: "s.standard_unit_price",
  isActive: "s.is_active",
  createdAt: "s.created_at",
} satisfies Record<string, string>;

const serviceSelect = `
  s.id,
  s.service_code as "serviceCode",
  s.name,
  s.description,
  s.standard_unit_price as "standardUnitPrice",
  s.service_type as "serviceType",
  s.is_active as "isActive",
  s.created_at as "createdAt",
  s.updated_at as "updatedAt"
`;

export type ServiceFilters = {
  isActive?: string | null;
};

export async function listServices(query: ListQuery, filters: ServiceFilters) {
  const values: unknown[] = [];
  const where = ["s.deleted_at is null"];

  if (query.search) {
    values.push(likeSearch(query.search));
    where.push(`(
      s.service_code ilike $${values.length}
      or s.name ilike $${values.length}
      or s.service_type ilike $${values.length}
    )`);
  }

  if (filters.isActive === "true" || filters.isActive === "false") {
    values.push(filters.isActive === "true");
    where.push(`s.is_active = $${values.length}`);
  }

  const whereSql = where.join(" and ");
  const totalResult = await db.query<{ total: string }>(
    `select count(*)::text as total from services s where ${whereSql}`,
    values,
  );
  const total = Number(totalResult.rows[0]?.total ?? 0);
  const pagination = getPagination(query.page, query.pageSize, total);

  values.push(query.pageSize, getOffset(query.page, query.pageSize));
  const sortClause = getSortClause(
    query.sortBy,
    query.sortOrder,
    serviceSortColumns,
    "s.created_at",
  );

  const result = await db.query(
    `
      select ${serviceSelect}
      from services s
      where ${whereSql}
      order by ${sortClause}
      limit $${values.length - 1} offset $${values.length}
    `,
    values,
  );

  return { rows: result.rows, pagination };
}

export async function getService(id: string) {
  const result = await db.query(
    `
      select ${serviceSelect}
      from services s
      where s.id = $1 and s.deleted_at is null
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function createService(input: unknown) {
  const data = serviceInputSchema.parse(input);
  const result = await db.query(
    `
      insert into services (
        service_code,
        name,
        description,
        standard_unit_price,
        service_type,
        is_active
      )
      values ($1, $2, $3, $4, $5, $6)
      returning id
    `,
    [
      data.serviceCode,
      data.name,
      data.description ?? null,
      data.standardUnitPrice,
      data.serviceType,
      data.isActive,
    ],
  );

  return getService(result.rows[0].id);
}

export async function updateService(id: string, input: unknown) {
  const data = servicePatchSchema.parse(input);
  const fieldMap: Record<string, string> = {
    serviceCode: "service_code",
    name: "name",
    description: "description",
    standardUnitPrice: "standard_unit_price",
    serviceType: "service_type",
    isActive: "is_active",
  };
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return getService(id);
  }

  const values: unknown[] = [];
  const assignments = entries.map(([key, value]) => {
    values.push(value);
    return `${fieldMap[key]} = $${values.length}`;
  });

  values.push(id);
  await db.query(
    `
      update services
      set ${assignments.join(", ")}
      where id = $${values.length} and deleted_at is null
    `,
    values,
  );

  return getService(id);
}

export async function deleteService(id: string) {
  const result = await db.query(
    `
      update services
      set deleted_at = now()
      where id = $1 and deleted_at is null
      returning id
    `,
    [id],
  );

  return Number(result.rowCount ?? 0) > 0;
}
