import { badRequest, handleApiError, noContent, notFound, ok } from "@/lib/api-response";
import {
  deleteEmployee,
  getEmployee,
  updateEmployee,
} from "@/features/hr/server/employees";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const employee = await getEmployee(id);

    return employee ? ok(employee) : notFound("Không tìm thấy nhân viên");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const employee = await updateEmployee(id, await request.json());

    return employee ? ok(employee) : notFound("Không tìm thấy nhân viên");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã nhân viên hoặc email công việc đã tồn tại");
    }

    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteEmployee(id);

    return deleted ? noContent() : notFound("Không tìm thấy nhân viên");
  } catch (error) {
    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
