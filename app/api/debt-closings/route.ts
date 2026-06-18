import { created, handleApiError, ok } from "@/lib/api-response";
import { closeDebtPeriod, debtClosingService } from "@/features/finance/server/debt";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await debtClosingService.list(parseListQuery(url.searchParams), {
      customerId: url.searchParams.get("customerId"),
    });

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await closeDebtPeriod(await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
