import { handleApiError, ok } from "@/lib/api-response";
import { cancelOneTimeTask } from "@/features/revenue/server/one-time-tasks";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return ok(await cancelOneTimeTask(id));
  } catch (error) {
    return handleApiError(error);
  }
}
