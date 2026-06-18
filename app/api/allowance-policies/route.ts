import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { allowancePolicyService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(allowancePolicyService, { filterKeys: ["status", "incomeTypeId", "departmentId", "jobLevelId", "taxability"], duplicateMessage: "Mã chính sách phụ cấp đã tồn tại" });
export const GET = handlers.GET;
export const POST = handlers.POST;
