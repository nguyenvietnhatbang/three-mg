import { badRequest, created, handleApiError, ok } from "@/lib/api-response";
import {
  createService,
  listServices,
  type ServiceFilters,
} from "@/features/crm/server/services";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = parseListQuery(url.searchParams);
    const filters: ServiceFilters = {
      isActive: url.searchParams.get("isActive"),
    };
    const result = await listServices(query, filters);

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const service = await createService(await request.json());

    return created(service);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã dịch vụ đã tồn tại");
    }

    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
