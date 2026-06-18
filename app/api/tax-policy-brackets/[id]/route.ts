import { createItemHandlers } from "@/features/shared/server/route-handlers";
import { taxPolicyBracketService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createItemHandlers(taxPolicyBracketService, { notFoundMessage: "Không tìm thấy bậc thuế", duplicateMessage: "Bậc thuế đã tồn tại trong chính sách" });
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
