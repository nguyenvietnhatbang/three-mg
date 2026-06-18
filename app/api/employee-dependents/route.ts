import { employeeDependentService } from "@/features/hr/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(employeeDependentService, {
  filterKeys: ["employeeId"],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
