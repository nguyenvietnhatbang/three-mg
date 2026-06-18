import { badRequest, handleApiError, noContent, notFound, ok } from "@/lib/api-response";
import { deletePayment, getPayment, updatePayment } from "@/features/finance/server/payments";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payment = await getPayment(id);
    return payment ? ok(payment) : notFound("Không tìm thấy phiếu thu");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payment = await updatePayment(id, await request.json());
    return payment ? ok(payment) : notFound("Không tìm thấy phiếu thu");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã phiếu thu đã tồn tại");
    }

    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deletePayment(id);
    return deleted ? noContent() : notFound("Không tìm thấy phiếu thu");
  } catch (error) {
    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
