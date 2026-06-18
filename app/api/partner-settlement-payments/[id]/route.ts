import { handleApiError, noContent, notFound, ok } from "@/lib/api-response";
import { deletePartnerSettlementPayment, partnerSettlementPaymentCrudService, updatePartnerSettlementPayment } from "@/features/finance/server/partner-settlements";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const row = await partnerSettlementPaymentCrudService.get(id);
    return row ? ok(row) : notFound("Không tìm thấy thanh toán đối tác");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const row = await updatePartnerSettlementPayment(id, await request.json());
    return row ? ok(row) : notFound("Không tìm thấy thanh toán đối tác");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deletePartnerSettlementPayment(id);
    return deleted ? noContent() : notFound("Không tìm thấy thanh toán đối tác");
  } catch (error) {
    return handleApiError(error);
  }
}
