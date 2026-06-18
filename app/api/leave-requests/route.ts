import { leaveRequestService } from "@/features/hr/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(leaveRequestService, {
  filterKeys: ["employeeId", "leaveTypeId", "status"],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
