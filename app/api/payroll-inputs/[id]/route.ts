import { createItemHandlers } from "@/features/shared/server/route-handlers";
import { payrollInputService } from "@/features/payroll/server/payroll";

export const runtime = "nodejs";

const handlers = createItemHandlers(payrollInputService, {
  notFoundMessage: "Không tìm thấy input kỳ lương",
  duplicateMessage: "Input kỳ lương của nhân viên đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
