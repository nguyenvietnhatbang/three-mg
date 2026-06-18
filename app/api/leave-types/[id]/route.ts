import { leaveTypeService } from "@/features/hr/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(leaveTypeService, {
  notFoundMessage: "Không tìm thấy loại phép",
  duplicateMessage: "Mã loại phép đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
