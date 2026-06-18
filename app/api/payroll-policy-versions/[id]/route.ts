import { createItemHandlers } from "@/features/shared/server/route-handlers";
import { payrollPolicyVersionService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createItemHandlers(payrollPolicyVersionService, { notFoundMessage: "Không tìm thấy chính sách lương", duplicateMessage: "Mã chính sách lương đã tồn tại" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
