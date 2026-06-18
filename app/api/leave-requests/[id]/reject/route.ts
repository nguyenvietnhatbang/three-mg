import { handleApiError, ok } from "@/lib/api-response";
import { rejectLeaveRequest } from "@/features/hr/server/leave-workflow";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return ok(await rejectLeaveRequest(id));
  } catch (error) {
    return handleApiError(error);
  }
}
