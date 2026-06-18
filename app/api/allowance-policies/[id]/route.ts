import { createItemHandlers } from "@/features/shared/server/route-handlers";
import { allowancePolicyService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createItemHandlers(allowancePolicyService, { notFoundMessage: "Không tìm thấy chính sách phụ cấp", duplicateMessage: "Mã chính sách phụ cấp đã tồn tại" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
