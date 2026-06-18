import { createItemHandlers } from "@/features/shared/server/route-handlers";
import { taxPolicyVersionService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createItemHandlers(taxPolicyVersionService, { notFoundMessage: "Không tìm thấy chính sách thuế", duplicateMessage: "Mã chính sách thuế đã tồn tại" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
