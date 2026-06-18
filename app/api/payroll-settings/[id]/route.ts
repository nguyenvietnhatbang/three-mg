import { employeePayrollSettingService } from "@/features/hr/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(employeePayrollSettingService, {
  notFoundMessage: "Không tìm thấy cấu hình lương cá nhân",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
