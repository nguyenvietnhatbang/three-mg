import { handleApiError, ok } from "@/lib/api-response";
import { cancelOrder } from "@/features/revenue/server/orders";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return ok(await cancelOrder(id));
  } catch (error) {
    return handleApiError(error);
  }
}
