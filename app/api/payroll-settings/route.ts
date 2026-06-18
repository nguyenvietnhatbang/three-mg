import { employeePayrollSettingService } from "@/features/hr/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(employeePayrollSettingService, {
  filterKeys: ["employeeId", "salaryPaymentType", "participatesInsurance"],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
