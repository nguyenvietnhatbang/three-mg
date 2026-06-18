import { badRequest, created, handleApiError, ok } from "@/lib/api-response";
import {
  createEmployee,
  listEmployees,
  type EmployeeFilters,
} from "@/features/hr/server/employees";
import { parseListQuery } from "@/features/shared/server/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = parseListQuery(url.searchParams);
    const filters: EmployeeFilters = {
      status: url.searchParams.get("status"),
      departmentId: url.searchParams.get("departmentId"),
      jobLevelId: url.searchParams.get("jobLevelId"),
      contractType: url.searchParams.get("contractType"),
      salaryPaymentType: url.searchParams.get("salaryPaymentType"),
    };
    const result = await listEmployees(query, filters);

    return ok(result.rows, result.pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const employee = await createEmployee(await request.json());

    return created(employee);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Mã nhân viên hoặc email công việc đã tồn tại");
    }

    return handleApiError(error);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
