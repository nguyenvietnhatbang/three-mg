import { badRequest, created, handleApiError, ok } from "@/lib/api-response";
import {
  createDepartment,
  listDepartments,
} from "@/features/hr/server/departments";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = parseListQuery(url.searchParams);
    const result = await listDepartments(query);

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const department = await createDepartment(await request.json());

    return created(department);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã phòng ban đã tồn tại");
    }

    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
