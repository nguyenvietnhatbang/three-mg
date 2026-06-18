import { created, handleApiError } from "@/lib/api-response";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { createDebtAdjustment, debtEntryService } from "@/features/finance/server/debt";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(debtEntryService, {
  filterKeys: ["customerId", "orderId", "paymentId", "entryType"],
});

export const GET = handlers.GET;

export async function POST(request: Request) {
  try {
    return created(await createDebtAdjustment(await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
