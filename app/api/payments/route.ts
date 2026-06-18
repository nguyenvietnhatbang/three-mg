import { badRequest, created, handleApiError, ok } from "@/lib/api-response";
import { createPayment, listPayments, type PaymentFilters } from "@/features/finance/server/payments";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters: PaymentFilters = {
      customerId: url.searchParams.get("customerId"),
      method: url.searchParams.get("method"),
      dateFrom: url.searchParams.get("dateFrom"),
      dateTo: url.searchParams.get("dateTo"),
    };
    const result = await listPayments(parseListQuery(url.searchParams), filters);

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createPayment(await request.json()));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã phiếu thu đã tồn tại");
    }

    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
