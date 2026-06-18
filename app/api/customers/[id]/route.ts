import { badRequest, handleApiError, noContent, notFound, ok } from "@/lib/api-response";
import {
  deleteCustomer,
  getCustomer,
  updateCustomer,
} from "@/features/crm/server/customers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const customer = await getCustomer(id);

    return customer ? ok(customer) : notFound("Không tìm thấy khách hàng");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const customer = await updateCustomer(id, await request.json());

    return customer ? ok(customer) : notFound("Không tìm thấy khách hàng");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã khách hàng hoặc mã số thuế đã tồn tại");
    }

    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteCustomer(id);

    return deleted ? noContent() : notFound("Không tìm thấy khách hàng");
  } catch (error) {
    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

