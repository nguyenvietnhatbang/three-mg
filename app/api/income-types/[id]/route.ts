import { incomeTypeService } from "@/features/hr/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(incomeTypeService, {
  notFoundMessage: "Không tìm thấy loại thu nhập",
  duplicateMessage: "Mã loại thu nhập đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
