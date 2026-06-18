import { badRequest, handleApiError, noContent, notFound, ok } from "@/lib/api-response";
import {
  deleteDepartment,
  getDepartment,
  updateDepartment,
} from "@/features/hr/server/departments";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const department = await getDepartment(id);

    return department ? ok(department) : notFound("Không tìm thấy phòng ban");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const department = await updateDepartment(id, await request.json());

    return department ? ok(department) : notFound("Không tìm thấy phòng ban");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã phòng ban đã tồn tại");
    }

    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteDepartment(id);

    return deleted ? noContent() : notFound("Không tìm thấy phòng ban");
  } catch (error) {
    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
