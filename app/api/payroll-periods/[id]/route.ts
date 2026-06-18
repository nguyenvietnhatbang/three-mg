import { createItemHandlers } from "@/features/shared/server/route-handlers";
import { payrollPeriodService } from "@/features/payroll/server/payroll";

export const runtime = "nodejs";

const handlers = createItemHandlers(payrollPeriodService, {
  notFoundMessage: "Không tìm thấy kỳ lương",
  duplicateMessage: "Mã kỳ lương đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
