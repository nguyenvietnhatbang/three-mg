import { handleApiError, ok } from "@/lib/api-response";
import { getHrLookups } from "@/features/hr/server/lookups";

export const runtime = "nodejs";

export async function GET() {
  try {
    const lookups = await getHrLookups();

    return ok(lookups);
  } catch (error) {
    return handleApiError(error);
  }
}
