import { badRequest, created, handleApiError, noContent, notFound, ok } from "@/lib/api-response";
import { parseListQuery } from "./query";

type ListResult = {
  rows: unknown[];
  pagination: Parameters<typeof ok>[1];
};

type CollectionService = {
  list: (query: ReturnType<typeof parseListQuery>, filters: Record<string, string | null>) => Promise<ListResult>;
  create: (input: unknown) => Promise<unknown>;
};

type ItemService = {
  get: (id: string) => Promise<unknown | null>;
  update: (id: string, input: unknown) => Promise<unknown | null>;
  remove: (id: string) => Promise<boolean>;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export function createCollectionHandlers(
  service: CollectionService,
  options: {
    filterKeys?: string[];
    duplicateMessage?: string;
  } = {},
) {
  async function GET(request: Request) {
    try {
      const url = new URL(request.url);
      const query = parseListQuery(url.searchParams);
      const filters = Object.fromEntries(
        (options.filterKeys ?? []).map((key) => [key, url.searchParams.get(key)]),
      );
      const result = await service.list(query, filters);

      return ok(result.rows, result.pagination);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async function POST(request: Request) {
    try {
      const record = await service.create(await request.json());

      return created(record);
    } catch (error) {
      if (options.duplicateMessage && isUniqueViolation(error)) {
        return badRequest(options.duplicateMessage);
      }

      return handleApiError(error);
    }
  }

  return { GET, POST };
}

export function createItemHandlers(
  service: ItemService,
  options: {
    notFoundMessage: string;
    duplicateMessage?: string;
  },
) {
  async function GET(_request: Request, context: RouteContext) {
    try {
      const { id } = await context.params;
      const record = await service.get(id);

      return record ? ok(record) : notFound(options.notFoundMessage);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async function PATCH(request: Request, context: RouteContext) {
    try {
      const { id } = await context.params;
      const record = await service.update(id, await request.json());

      return record ? ok(record) : notFound(options.notFoundMessage);
    } catch (error) {
      if (options.duplicateMessage && isUniqueViolation(error)) {
        return badRequest(options.duplicateMessage);
      }

      return handleApiError(error);
    }
  }

  async function DELETE(_request: Request, context: RouteContext) {
    try {
      const { id } = await context.params;
      const deleted = await service.remove(id);

      return deleted ? noContent() : notFound(options.notFoundMessage);
    } catch (error) {
      return handleApiError(error);
    }
  }

  return { GET, PATCH, DELETE };
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
