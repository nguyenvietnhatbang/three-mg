import { deductionTypeService } from "@/features/hr/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(deductionTypeService, {
  notFoundMessage: "Không tìm thấy loại khấu trừ",
  duplicateMessage: "Mã loại khấu trừ đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
