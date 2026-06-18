import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { recurringBatchService } from "@/features/revenue/server/recurring-batches";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(recurringBatchService, {
  filterKeys: ["status", "periodStart", "periodEnd"],
  duplicateMessage: "Mã batch đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
