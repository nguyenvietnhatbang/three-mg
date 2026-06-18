import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { payrollInputService } from "@/features/payroll/server/payroll";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(payrollInputService, {
  filterKeys: ["payrollPeriodId", "employeeId"],
  duplicateMessage: "Input kỳ lương của nhân viên đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
