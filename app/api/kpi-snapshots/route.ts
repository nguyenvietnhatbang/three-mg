import { created, handleApiError, ok } from "@/lib/api-response";
import { generateKpiSnapshots, listKpiSnapshots } from "@/features/analytics/server/kpi";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await listKpiSnapshots(parseListQuery(url.searchParams), {
      employeeId: url.searchParams.get("employeeId"),
      departmentId: url.searchParams.get("departmentId"),
      periodStart: url.searchParams.get("periodStart"),
      periodEnd: url.searchParams.get("periodEnd"),
    });

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await generateKpiSnapshots(await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
