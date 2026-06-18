import { leaveBalanceService } from "@/features/hr/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(leaveBalanceService, {
  notFoundMessage: "Không tìm thấy số dư phép",
  duplicateMessage: "Số dư phép của nhân viên, loại phép và năm này đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
