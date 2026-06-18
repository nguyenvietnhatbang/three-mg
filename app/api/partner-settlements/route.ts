import { createCollectionHandlers } from "@/features/shared/server/route-handlers";
import { partnerSettlementService } from "@/features/finance/server/partner-settlements";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(partnerSettlementService, {
  filterKeys: ["partnerId", "status", "settlementType"],
  duplicateMessage: "Mã đối soát đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
