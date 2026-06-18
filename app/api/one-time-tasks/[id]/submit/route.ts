import { handleApiError, ok } from "@/lib/api-response";
import { submitOneTimeTask } from "@/features/revenue/server/one-time-tasks";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return ok(await submitOneTimeTask(id));
  } catch (error) {
    return handleApiError(error);
  }
}
