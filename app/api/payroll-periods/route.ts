import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { payrollPeriodService } from "@/features/payroll/server/payroll";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(payrollPeriodService, {
  filterKeys: ["status"],
  duplicateMessage: "Mã kỳ lương đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
