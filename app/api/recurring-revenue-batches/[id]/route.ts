import { createItemHandlers } from "@/features/shared/server/route-handlers";
import { recurringBatchService } from "@/features/revenue/server/recurring-batches";

export const runtime = "nodejs";

const handlers = createItemHandlers(recurringBatchService, {
  notFoundMessage: "Không tìm thấy batch doanh thu",
  duplicateMessage: "Mã batch đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
