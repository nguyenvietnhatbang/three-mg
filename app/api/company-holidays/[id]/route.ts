import { companyHolidayService } from "@/features/hr/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(companyHolidayService, {
  notFoundMessage: "Không tìm thấy lịch nghỉ",
  duplicateMessage: "Ngày nghỉ này đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
