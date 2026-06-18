import { partnerService } from "@/features/crm/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(partnerService, {
  notFoundMessage: "Không tìm thấy đối tác",
  duplicateMessage: "Mã đối tác đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
