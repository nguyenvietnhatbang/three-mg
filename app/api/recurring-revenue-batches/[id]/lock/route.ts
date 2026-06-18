import { handleApiError, ok } from "@/lib/api-response";
import { lockRecurringBatch } from "@/features/revenue/server/recurring-batches";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return ok(await lockRecurringBatch(id));
  } catch (error) {
    return handleApiError(error);
  }
}
