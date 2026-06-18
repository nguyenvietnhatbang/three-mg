import { getCrmLookups } from "@/features/crm/server/lookups";
import { handleApiError, ok } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await getCrmLookups());
  } catch (error) {
    return handleApiError(error);
  }
}

