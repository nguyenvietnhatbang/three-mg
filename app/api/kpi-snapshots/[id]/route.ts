import { handleApiError, notFound, ok } from "@/lib/api-response";
import { getKpiSnapshot } from "@/features/analytics/server/kpi";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const row = await getKpiSnapshot(id);
    return row ? ok(row) : notFound("Không tìm thấy KPI snapshot");
  } catch (error) {
    return handleApiError(error);
  }
}
