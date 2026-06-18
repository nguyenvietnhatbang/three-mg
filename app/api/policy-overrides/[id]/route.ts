import { employeePolicyOverrideService } from "@/features/hr/server/foundation";
import { createItemHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createItemHandlers(employeePolicyOverrideService, {
  notFoundMessage: "Không tìm thấy ngoại lệ chính sách",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
