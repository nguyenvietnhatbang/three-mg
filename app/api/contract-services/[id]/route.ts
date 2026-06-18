import { contractServiceService } from "@/features/crm/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(contractServiceService, {
  notFoundMessage: "Không tìm thấy dịch vụ trong hợp đồng",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
