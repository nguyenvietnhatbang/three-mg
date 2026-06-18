import { partnerService } from "@/features/crm/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(partnerService, {
  filterKeys: ["isActive"],
  duplicateMessage: "Mã đối tác đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
