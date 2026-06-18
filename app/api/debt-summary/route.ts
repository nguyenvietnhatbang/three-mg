import { handleApiError, ok } from "@/lib/api-response";
import { listDebtSummary, type DebtSummaryFilters } from "@/features/finance/server/debt";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters: DebtSummaryFilters = {
      customerId: url.searchParams.get("customerId"),
      periodStart: url.searchParams.get("periodStart"),
      periodEnd: url.searchParams.get("periodEnd"),
    };
    const result = await listDebtSummary(parseListQuery(url.searchParams), filters);

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}
