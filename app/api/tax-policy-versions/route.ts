import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { taxPolicyVersionService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(taxPolicyVersionService, { filterKeys: ["status"], duplicateMessage: "Mã chính sách thuế đã tồn tại" });
export const GET = handlers.GET;
export const POST = handlers.POST;
