import { contractServiceService } from "@/features/crm/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(contractServiceService, {
  filterKeys: ["contractId", "serviceId", "billingCycle"],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
