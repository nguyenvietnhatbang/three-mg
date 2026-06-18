import { badRequest, created, handleApiError, ok } from "@/lib/api-response";
import {
  createCustomer,
  listCustomers,
  type CustomerFilters,
} from "@/features/crm/server/customers";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = parseListQuery(url.searchParams);
    const filters: CustomerFilters = {
      status: url.searchParams.get("status"),
      assignedEmployeeId: url.searchParams.get("assignedEmployeeId"),
    };
    const result = await listCustomers(query, filters);

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const customer = await createCustomer(await request.json());

    return created(customer);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã khách hàng hoặc mã số thuế đã tồn tại");
    }

    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
