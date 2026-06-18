import { badRequest, created, handleApiError, ok } from "@/lib/api-response";
import { createOrder, listOrders, type OrderFilters } from "@/features/revenue/server/orders";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters: OrderFilters = {
      status: url.searchParams.get("status"),
      customerId: url.searchParams.get("customerId"),
      contractId: url.searchParams.get("contractId"),
      employeeId: url.searchParams.get("employeeId"),
      partnerId: url.searchParams.get("partnerId"),
      paymentStatus: url.searchParams.get("paymentStatus"),
      orderType: url.searchParams.get("orderType"),
      periodStart: url.searchParams.get("periodStart"),
      periodEnd: url.searchParams.get("periodEnd"),
      dateFrom: url.searchParams.get("dateFrom"),
      dateTo: url.searchParams.get("dateTo"),
    };
    const result = await listOrders(parseListQuery(url.searchParams), filters);

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createOrder(await request.json()));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã đơn hàng đã tồn tại");
    }

    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
