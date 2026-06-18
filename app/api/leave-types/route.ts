import { leaveTypeService } from "@/features/hr/server/foundation";
import { createCollectionHandlers } from "@/features/shared/server/route-handlers";

export const runtime = "nodejs";

const handlers = createCollectionHandlers(leaveTypeService, {
  filterKeys: ["isPaid"],
  duplicateMessage: "Mã loại phép đã tồn tại",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
