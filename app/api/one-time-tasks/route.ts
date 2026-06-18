import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { oneTimeTaskService } from "@/features/revenue/server/one-time-tasks";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(oneTimeTaskService, {
  filterKeys: ["status", "customerId", "employeeId"],
  duplicateMessage: "Mã task đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
