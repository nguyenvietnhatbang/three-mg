import { createItemHandlers } from "@/features/shared/server/route-handlers";
import { commissionPolicyService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createItemHandlers(commissionPolicyService, { notFoundMessage: "Không tìm thấy chính sách hoa hồng", duplicateMessage: "Mã chính sách hoa hồng đã tồn tại" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
