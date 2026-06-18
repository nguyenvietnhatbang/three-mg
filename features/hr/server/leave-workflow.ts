import type { PoolClient } from "pg";
import { BadRequestError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { leaveRequestService } from "./foundation";

export async function submitLeaveRequest(id: string) {
  await transitionLeaveRequest(id, ["draft"], "pending");
  return leaveRequestService.get(id);
}

export async function approveLeaveRequest(id: string) {
  const client = await db.connect();

  try {
    await client.query("begin");
    const request = await getLeaveRequestForUpdate(client, id);

    if (!request) {
      throw new BadRequestError("Không tìm thấy đơn nghỉ phép");
    }

    if (!["draft", "pending"].includes(request.status)) {
      throw new BadRequestError("Chỉ đơn nháp hoặc chờ duyệt mới được duyệt");
    }

    await client.query(
      "update leave_requests set status = 'approved', approved_at = now(), updated_at = now() where id = $1",
      [id],
    );
    await applyLeaveBalanceDelta(client, request, Number(request.totalDays));
    await client.query("commit");

    return leaveRequestService.get(id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectLeaveRequest(id: string) {
  await transitionLeaveRequest(id, ["draft", "pending"], "rejected", "Từ chối trên hệ thống");
  return leaveRequestService.get(id);
}

export async function cancelLeaveRequest(id: string) {
  const client = await db.connect();

  try {
    await client.query("begin");
    const request = await getLeaveRequestForUpdate(client, id);

    if (!request) {
      throw new BadRequestError("Không tìm thấy đơn nghỉ phép");
    }

    if (!["draft", "pending", "approved"].includes(request.status)) {
      throw new BadRequestError("Trạng thái đơn nghỉ không thể hủy");
    }

    if (request.status === "approved") {
      await applyLeaveBalanceDelta(client, request, -Number(request.totalDays));
    }

    await client.query(
      "update leave_requests set status = 'cancelled', updated_at = now() where id = $1",
      [id],
    );
    await client.query("commit");

    return leaveRequestService.get(id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function transitionLeaveRequest(id: string, allowed: string[], nextStatus: string, rejectedReason?: string) {
  const result = await db.query(
    `
      update leave_requests
      set status = $2,
          rejected_reason = coalesce($4, rejected_reason),
          updated_at = now()
      where id = $1 and deleted_at is null and status = any($3::leave_request_status[])
      returning id
    `,
    [id, nextStatus, allowed, rejectedReason ?? null],
  );

  if (!result.rows[0]) {
    throw new BadRequestError("Trạng thái đơn nghỉ không hợp lệ cho thao tác này");
  }
}

async function getLeaveRequestForUpdate(client: PoolClient, id: string) {
  const result = await client.query<{
    id: string;
    employeeId: string;
    leaveTypeId: string;
    status: string;
    startDate: string;
    totalDays: string;
  }>(
    `
      select id, employee_id as "employeeId", leave_type_id as "leaveTypeId",
             status, start_date as "startDate", total_days::text as "totalDays"
      from leave_requests
      where id = $1 and deleted_at is null
      for update
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

async function applyLeaveBalanceDelta(
  client: PoolClient,
  request: { employeeId: string; leaveTypeId: string; startDate: string },
  usedDaysDelta: number,
) {
  const year = Number(String(request.startDate).slice(0, 4));

  await client.query(
    `
      insert into leave_balances (employee_id, leave_type_id, year, used_days, closing_days)
      values ($1, $2, $3, $4, -$4)
      on conflict (employee_id, leave_type_id, year)
      do update set
        used_days = leave_balances.used_days + excluded.used_days,
        closing_days = leave_balances.opening_days + leave_balances.earned_days + leave_balances.adjusted_days - (leave_balances.used_days + excluded.used_days),
        updated_at = now()
    `,
    [request.employeeId, request.leaveTypeId, year, usedDaysDelta],
  );
}
