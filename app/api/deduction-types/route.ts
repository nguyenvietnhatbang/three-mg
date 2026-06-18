import { deductionTypeService } from "@/features/hr/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(deductionTypeService, {
  filterKeys: ["isActive"],
  duplicateMessage: "Mã loại khấu trừ đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
