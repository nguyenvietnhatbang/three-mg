import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { taxPolicyBracketService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(taxPolicyBracketService, { filterKeys: ["taxPolicyVersionId"], duplicateMessage: "Bậc thuế đã tồn tại trong chính sách" });
export const GET = handlers.GET;
export const POST = handlers.POST;
