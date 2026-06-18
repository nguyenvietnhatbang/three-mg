import { handleApiError, ok } from "@/lib/api-response";
import { cancelRecurringBatch } from "@/features/revenue/server/recurring-batches";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return ok(await cancelRecurringBatch(id));
  } catch (error) {
    return handleApiError(error);
  }
}
