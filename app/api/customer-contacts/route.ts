import { customerContactService } from "@/features/crm/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(customerContactService, {
  filterKeys: ["customerId", "isPrimary"],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
