import { legalEntityService } from "@/features/crm/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(legalEntityService, {
  filterKeys: ["isActive"],
  duplicateMessage: "Mã pháp nhân đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
