import type { z } from "zod";
import { db } from "@/lib/db";
import {
  getOffset,
  getPagination,
  getSortClause,
  likeSearch,
  type ListQuery,
} from "./query";

type RecordData = Record<string, unknown>;

type FilterConfig = {
  column: string;
  schema?: z.ZodTypeAny;
};

type ManagementCrudConfig = {
  tableName: string;
  tableAlias: string;
  selectSql: string;
  fromSql: string;
  searchColumns: string[];
  sortColumns: Record<string, string>;
  defaultSort: string;
  fieldMap: Record<string, string>;
  inputSchema: z.ZodTypeAny;
  patchSchema: z.ZodTypeAny;
  filters?: Record<string, FilterConfig>;
  deletedAtColumn?: string | null;
  beforeCreate?: (data: RecordData) => Promise<void>;
  beforeUpdate?: (id: string, data: RecordData) => Promise<void>;
};

export function createManagementCrudService(config: ManagementCrudConfig) {
  async function list(query: ListQuery, filters: Record<string, string | null | undefined> = {}) {
    const values: unknown[] = [];
    const deletedAtColumn = config.deletedAtColumn === undefined
      ? `${config.tableAlias}.deleted_at`
      : config.deletedAtColumn;
    const where = deletedAtColumn ? [`${deletedAtColumn} is null`] : ["true"];

    if (query.search) {
      values.push(likeSearch(query.search));
      where.push(
        `(${config.searchColumns.map((column) => `${column} ilike $${values.length}`).join(" or ")})`,
      );
    }

    Object.entries(config.filters ?? {}).forEach(([key, filterConfig]) => {
      const value = filters[key];

      if (!value) {
        return;
      }

      const parsed = filterConfig.schema ? filterConfig.schema.parse(value) : value;
      values.push(parsed);
      where.push(`${filterConfig.column} = $${values.length}`);
    });

    const whereSql = where.join(" and ");
    const totalResult = await db.query<{ total: string }>(
      `select count(*)::text as total ${config.fromSql} where ${whereSql}`,
      values,
    );
    const total = Number(totalResult.rows[0]?.total ?? 0);
    const pagination = getPagination(query.page, query.pageSize, total);
    values.push(query.pageSize, getOffset(query.page, query.pageSize));
    const sortClause = getSortClause(
      query.sortBy,
      query.sortOrder,
      config.sortColumns,
      config.defaultSort,
    );

    const result = await db.query(
      `
        select ${config.selectSql}
        ${config.fromSql}
        where ${whereSql}
        order by ${sortClause}
        limit $${values.length - 1} offset $${values.length}
      `,
      values,
    );

    return { rows: result.rows, pagination };
  }

  async function get(id: string) {
    const deletedAtColumn = config.deletedAtColumn === undefined
      ? `${config.tableAlias}.deleted_at`
      : config.deletedAtColumn;
    const deletedWhere = deletedAtColumn ? `and ${deletedAtColumn} is null` : "";
    const result = await db.query(
      `
        select ${config.selectSql}
        ${config.fromSql}
        where ${config.tableAlias}.id = $1 ${deletedWhere}
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async function create(input: unknown) {
    const data = config.inputSchema.parse(input) as RecordData;

    if (config.beforeCreate) {
      await config.beforeCreate(data);
    }

    const entries = Object.entries(config.fieldMap).filter(([key]) => data[key] !== undefined);
    const columns = entries.map(([, column]) => column);
    const values = entries.map(([key]) => data[key]);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const result = await db.query<{ id: string }>(
      `
        insert into ${config.tableName} (${columns.join(", ")})
        values (${placeholders.join(", ")})
        returning id
      `,
      values,
    );

    return get(result.rows[0].id);
  }

  async function update(id: string, input: unknown) {
    const data = config.patchSchema.parse(input) as RecordData;

    if (config.beforeUpdate) {
      await config.beforeUpdate(id, data);
    }

    const entries = Object.entries(config.fieldMap).filter(([key]) => data[key] !== undefined);

    if (entries.length === 0) {
      return get(id);
    }

    const values: unknown[] = [];
    const assignments = entries.map(([key, column]) => {
      values.push(data[key]);
      return `${column} = $${values.length}`;
    });
    values.push(id);
    const deletedWhere = config.deletedAtColumn === null ? "" : "and deleted_at is null";
    await db.query(
      `
        update ${config.tableName}
        set ${assignments.join(", ")}
        where id = $${values.length} ${deletedWhere}
      `,
      values,
    );

    return get(id);
  }

  async function remove(id: string) {
    if (config.deletedAtColumn === null) {
      const result = await db.query(
        `
          delete from ${config.tableName}
          where id = $1
          returning id
        `,
        [id],
      );

      return Number(result.rowCount ?? 0) > 0;
    }

    const result = await db.query(
      `
        update ${config.tableName}
        set deleted_at = now()
        where id = $1 and deleted_at is null
        returning id
      `,
      [id],
    );

    return Number(result.rowCount ?? 0) > 0;
  }

  return { list, get, create, update, remove };
}
