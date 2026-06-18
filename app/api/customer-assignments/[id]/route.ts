import { customerAssignmentService } from "@/features/crm/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(customerAssignmentService, {
  notFoundMessage: "Không tìm thấy phân công khách hàng",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
