import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { payrollPolicyVersionService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(payrollPolicyVersionService, { filterKeys: ["status"], duplicateMessage: "Mã chính sách lương đã tồn tại" });
export const GET = handlers.GET;
export const POST = handlers.POST;
