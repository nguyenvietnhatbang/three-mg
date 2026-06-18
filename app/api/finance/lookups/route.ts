import { handleApiError, ok } from "@/lib/api-response";
import { getFinanceLookups } from "@/features/finance/server/lookups";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await getFinanceLookups());
  } catch (error) {
    return handleApiError(error);
  }
}
