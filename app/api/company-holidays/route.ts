import { companyHolidayService } from "@/features/hr/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(companyHolidayService, {
  filterKeys: ["isPaid"],
  duplicateMessage: "Ngày nghỉ này đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
