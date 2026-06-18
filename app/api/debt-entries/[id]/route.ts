import { handleApiError, noContent, notFound, ok } from "@/lib/api-response";
import { debtEntryService, deleteDebtEntry } from "@/features/finance/server/debt";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const row = await debtEntryService.get(id);
    return row ? ok(row) : notFound("Không tìm thấy dòng công nợ");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const row = await debtEntryService.update(id, await request.json());
    return row ? ok(row) : notFound("Không tìm thấy dòng công nợ");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteDebtEntry(id);
    return deleted ? noContent() : notFound("Không tìm thấy dòng công nợ");
  } catch (error) {
    return handleApiError(error);
  }
}
