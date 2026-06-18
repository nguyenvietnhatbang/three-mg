import { badRequest, created, handleApiError, ok } from "@/lib/api-response";
import {
  createContract,
  listContracts,
  type ContractFilters,
} from "@/features/crm/server/contracts";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = parseListQuery(url.searchParams);
    const filters: ContractFilters = {
      status: url.searchParams.get("status"),
      customerId: url.searchParams.get("customerId"),
      billingCycle: url.searchParams.get("billingCycle"),
      assignedEmployeeId: url.searchParams.get("assignedEmployeeId"),
    };
    const result = await listContracts(query, filters);

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const contract = await createContract(await request.json());

    return created(contract);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã hợp đồng đã tồn tại");
    }

    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
