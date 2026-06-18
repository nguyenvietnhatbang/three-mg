import { createItemHandlers } from "@/features/shared/server/route-handlers";
import { partnerSettlementService } from "@/features/finance/server/partner-settlements";

export const runtime = "nodejs";

const handlers = createItemHandlers(partnerSettlementService, {
  notFoundMessage: "Không tìm thấy khoản đối soát",
  duplicateMessage: "Mã đối soát đã tồn tại",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
