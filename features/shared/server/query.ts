import { z } from "zod";
import type { Pagination } from "@/lib/api-response";

export const sortOrderSchema = z.enum(["asc", "desc"]).default("asc");

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(10),
  search: z.string().trim().default(""),
  sortBy: z.string().trim().optional(),
  sortOrder: sortOrderSchema,
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export function parseListQuery(searchParams: URLSearchParams) {
  return listQuerySchema.parse(Object.fromEntries(searchParams.entries()));
}

export function getPagination(page: number, pageSize: number, total: number): Pagination {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export function getOffset(page: number, pageSize: number) {
  return (page - 1) * pageSize;
}

export function getSortClause(
  sortBy: string | undefined,
  sortOrder: "asc" | "desc",
  sortColumns: Record<string, string>,
  defaultSort: string,
) {
  const column = sortBy ? sortColumns[sortBy] : undefined;
  const direction = sortOrder === "desc" ? "desc" : "asc";

  return `${column ?? defaultSort} ${direction}`;
}

export function likeSearch(search: string) {
  return `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

