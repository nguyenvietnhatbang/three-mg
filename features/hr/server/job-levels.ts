import { db } from "@/lib/db";
import {
  getOffset,
  getPagination,
  getSortClause,
  likeSearch,
  type ListQuery,
} from "@/features/shared/server/query";
import { jobLevelInputSchema, jobLevelPatchSchema } from "./validators";

const jobLevelSortColumns = {
  code: "jl.code",
  name: "jl.name",
  rankOrder: "jl.rank_order",
  createdAt: "jl.created_at",
} satisfies Record<string, string>;

const jobLevelSelect = `
  jl.id,
  jl.code,
  jl.name,
  jl.rank_order as "rankOrder",
  jl.description,
  jl.created_at as "createdAt",
  jl.updated_at as "updatedAt"
`;

export async function listJobLevels(query: ListQuery) {
  const values: unknown[] = [];
  const where = ["jl.deleted_at is null"];

  if (query.search) {
    values.push(likeSearch(query.search));
    where.push(`(jl.code ilike $${values.length} or jl.name ilike $${values.length})`);
  }

  const whereSql = where.join(" and ");
  const totalResult = await db.query<{ total: string }>(
    `select count(*)::text as total from job_levels jl where ${whereSql}`,
    values,
  );
  const total = Number(totalResult.rows[0]?.total ?? 0);
  const pagination = getPagination(query.page, query.pageSize, total);
  values.push(query.pageSize, getOffset(query.page, query.pageSize));
  const sortClause = getSortClause(
    query.sortBy,
    query.sortOrder,
    jobLevelSortColumns,
    "jl.rank_order",
  );

  const result = await db.query(
    `
      select ${jobLevelSelect}
      from job_levels jl
      where ${whereSql}
      order by ${sortClause}
      limit $${values.length - 1} offset $${values.length}
    `,
    values,
  );

  return { rows: result.rows, pagination };
}

export async function getJobLevel(id: string) {
  const result = await db.query(
    `
      select ${jobLevelSelect}
      from job_levels jl
      where jl.id = $1 and jl.deleted_at is null
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function createJobLevel(input: unknown) {
  const data = jobLevelInputSchema.parse(input);
  const result = await db.query(
    `
      insert into job_levels (code, name, rank_order, description)
      values ($1, $2, $3, $4)
      returning id
    `,
    [data.code, data.name, data.rankOrder, data.description ?? null],
  );

  return getJobLevel(result.rows[0].id);
}

export async function updateJobLevel(id: string, input: unknown) {
  const data = jobLevelPatchSchema.parse(input);
  const fieldMap: Record<string, string> = {
    code: "code",
    name: "name",
    rankOrder: "rank_order",
    description: "description",
  };
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return getJobLevel(id);
  }

  const values: unknown[] = [];
  const assignments = entries.map(([key, value]) => {
    values.push(value);
    return `${fieldMap[key]} = $${values.length}`;
  });
  values.push(id);
  await db.query(
    `update job_levels set ${assignments.join(", ")} where id = $${values.length} and deleted_at is null`,
    values,
  );

  return getJobLevel(id);
}

export async function deleteJobLevel(id: string) {
  const result = await db.query(
    `
      update job_levels
      set deleted_at = now()
      where id = $1 and deleted_at is null
      returning id
    `,
    [id],
  );

  return Number(result.rowCount ?? 0) > 0;
}

