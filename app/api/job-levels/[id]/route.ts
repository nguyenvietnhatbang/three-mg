import { badRequest, handleApiError, noContent, notFound, ok } from "@/lib/api-response";
import {
  deleteJobLevel,
  getJobLevel,
  updateJobLevel,
} from "@/features/hr/server/job-levels";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const jobLevel = await getJobLevel(id);

    return jobLevel ? ok(jobLevel) : notFound("Không tìm thấy bậc/chức danh");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const jobLevel = await updateJobLevel(id, await request.json());

    return jobLevel ? ok(jobLevel) : notFound("Không tìm thấy bậc/chức danh");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã bậc/chức danh đã tồn tại");
    }

    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteJobLevel(id);

    return deleted ? noContent() : notFound("Không tìm thấy bậc/chức danh");
  } catch (error) {
    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
