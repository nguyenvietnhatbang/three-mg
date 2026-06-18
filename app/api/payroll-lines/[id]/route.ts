import { handleApiError, notFound, ok } from "@/lib/api-response";
import { getPayrollLine } from "@/features/payroll/server/payroll";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const row = await getPayrollLine(id);
    return row ? ok(row) : notFound("Không tìm thấy dòng lương");
  } catch (error) {
    return handleApiError(error);
  }
}
