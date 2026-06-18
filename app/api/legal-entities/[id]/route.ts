import { legalEntityService } from "@/features/crm/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(legalEntityService, {
  notFoundMessage: "Không tìm thấy pháp nhân",
  duplicateMessage: "Mã pháp nhân đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
