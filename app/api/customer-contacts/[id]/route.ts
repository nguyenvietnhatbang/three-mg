import { customerContactService } from "@/features/crm/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(customerContactService, {
  notFoundMessage: "Không tìm thấy liên hệ khách hàng",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
