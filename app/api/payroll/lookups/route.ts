import { handleApiError, ok } from "@/lib/api-response";
import { getPayrollLookups } from "@/features/payroll/server/lookups";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await getPayrollLookups());
  } catch (error) {
    return handleApiError(error);
  }
}
