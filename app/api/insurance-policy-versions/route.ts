import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { insurancePolicyVersionService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(insurancePolicyVersionService, { filterKeys: ["status"], duplicateMessage: "Mã chính sách bảo hiểm đã tồn tại" });
export const GET = handlers.GET;
export const POST = handlers.POST;
