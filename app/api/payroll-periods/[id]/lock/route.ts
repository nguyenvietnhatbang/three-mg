import { handleApiError, ok } from "@/lib/api-response";
import { transitionPayrollPeriod } from "@/features/payroll/server/payroll";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return ok(await transitionPayrollPeriod(id, "lock"));
  } catch (error) {
    return handleApiError(error);
  }
}
