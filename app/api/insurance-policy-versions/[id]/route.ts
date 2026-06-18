import { createItemHandlers } from "@/features/shared/server/route-handlers";
import { insurancePolicyVersionService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createItemHandlers(insurancePolicyVersionService, { notFoundMessage: "Không tìm thấy chính sách bảo hiểm", duplicateMessage: "Mã chính sách bảo hiểm đã tồn tại" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
