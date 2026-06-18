import { handleApiError, ok } from "@/lib/api-response";
import { getDashboardOverview } from "@/features/analytics/server/dashboard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return ok(await getDashboardOverview(url.searchParams));
  } catch (error) {
    return handleApiError(error);
  }
}
