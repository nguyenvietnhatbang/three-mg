import { incomeTypeService } from "@/features/hr/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(incomeTypeService, {
  filterKeys: ["taxability", "isActive", "isCommission"],
  duplicateMessage: "Mã loại thu nhập đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
