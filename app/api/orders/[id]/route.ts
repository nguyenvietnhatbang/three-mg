import { badRequest, handleApiError, noContent, notFound, ok } from "@/lib/api-response";
import { deleteOrder, getOrder, updateOrder } from "@/features/revenue/server/orders";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const order = await getOrder(id);
    return order ? ok(order) : notFound("Không tìm thấy đơn hàng");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const order = await updateOrder(id, await request.json());
    return order ? ok(order) : notFound("Không tìm thấy đơn hàng");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã đơn hàng đã tồn tại");
    }

    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteOrder(id);
    return deleted ? noContent() : notFound("Không tìm thấy đơn hàng");
  } catch (error) {
    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
