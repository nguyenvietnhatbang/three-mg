import { leaveRequestService } from "@/features/hr/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(leaveRequestService, {
  notFoundMessage: "Không tìm thấy đơn nghỉ phép",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
