import { badRequest, handleApiError, noContent, notFound, ok } from "@/lib/api-response";
import {
  deleteContract,
  getContract,
  updateContract,
} from "@/features/crm/server/contracts";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contract = await getContract(id);

    return contract ? ok(contract) : notFound("Không tìm thấy hợp đồng");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contract = await updateContract(id, await request.json());

    return contract ? ok(contract) : notFound("Không tìm thấy hợp đồng");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã hợp đồng đã tồn tại");
    }

    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteContract(id);

    return deleted ? noContent() : notFound("Không tìm thấy hợp đồng");
  } catch (error) {
    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

