import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { commissionPolicyService } from "@/features/payroll/server/policies";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(commissionPolicyService, { filterKeys: ["status", "departmentId", "jobLevelId", "contractType", "salaryPaymentType"], duplicateMessage: "Mã chính sách hoa hồng đã tồn tại" });
export const GET = handlers.GET;
export const POST = handlers.POST;
