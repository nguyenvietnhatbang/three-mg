import { badRequest, handleApiError, noContent, notFound, ok } from "@/lib/api-response";
import {
  deleteService,
  getService,
  updateService,
} from "@/features/crm/server/services";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const service = await getService(id);

    return service ? ok(service) : notFound("Không tìm thấy dịch vụ");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const service = await updateService(id, await request.json());

    return service ? ok(service) : notFound("Không tìm thấy dịch vụ");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã dịch vụ đã tồn tại");
    }

    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteService(id);

    return deleted ? noContent() : notFound("Không tìm thấy dịch vụ");
  } catch (error) {
    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

