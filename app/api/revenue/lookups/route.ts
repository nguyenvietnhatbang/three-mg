import { handleApiError, ok } from "@/lib/api-response";
import { getRevenueLookups } from "@/features/revenue/server/lookups";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await getRevenueLookups());
  } catch (error) {
    return handleApiError(error);
  }
}
