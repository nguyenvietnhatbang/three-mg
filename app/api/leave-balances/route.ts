import { leaveBalanceService } from "@/features/hr/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(leaveBalanceService, {
  filterKeys: ["employeeId", "leaveTypeId"],
  duplicateMessage: "Số dư phép của nhân viên, loại phép và năm này đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
