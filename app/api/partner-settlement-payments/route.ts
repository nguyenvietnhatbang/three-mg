import { created, handleApiError, ok } from "@/lib/api-response";
import { createPartnerSettlementPayment, partnerSettlementPaymentCrudService } from "@/features/finance/server/partner-settlements";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await partnerSettlementPaymentCrudService.list(parseListQuery(url.searchParams), {
      partnerSettlementId: url.searchParams.get("partnerSettlementId"),
      method: url.searchParams.get("method"),
    });

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createPartnerSettlementPayment(await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
