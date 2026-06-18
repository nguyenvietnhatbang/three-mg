import { handleApiError, ok } from "@/lib/api-response";
import { listPayrollLines } from "@/features/payroll/server/payroll";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await listPayrollLines(parseListQuery(url.searchParams), {
      payrollPeriodId: url.searchParams.get("payrollPeriodId"),
      employeeId: url.searchParams.get("employeeId"),
      status: url.searchParams.get("status"),
    });

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}
