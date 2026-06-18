import { createItemHandlers } from "@/features/shared/server/route-handlers";
import { oneTimeTaskService } from "@/features/revenue/server/one-time-tasks";

export const runtime = "nodejs";

const handlers = createItemHandlers(oneTimeTaskService, {
  notFoundMessage: "Không tìm thấy task phát sinh",
  duplicateMessage: "Mã task đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
