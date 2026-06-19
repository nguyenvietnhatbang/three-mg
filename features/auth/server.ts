import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { BadRequestError } from "@/lib/api-response";
import { db } from "@/lib/db";
import {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getSessionExpiresAt,
  signSessionPayload,
  verifySessionToken,
} from "./session-token";
import { deriveScope } from "./permissions";
import type { AuthSession, AuthUser } from "./types";

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string | null;
  status: AuthUser["status"];
  employeeId: string | null;
  employeeName: string | null;
  departmentId: string | null;
};

const baselineRoles = [
  ["admin", "Admin", "Full system administration"],
  ["manager", "Quản lý", "Company-wide management access"],
  ["department_head", "Trưởng phòng", "Department/team management access"],
  ["employee", "Nhân viên", "Employee self-service and assigned work access"],
] as const;

const baselinePermissions = [
  ["customers.view", "View customers", "customers", "view"],
  ["customers.manage", "Manage customers", "customers", "manage"],
  ["contracts.manage", "Manage contracts", "contracts", "manage"],
  ["services.manage", "Manage services", "services", "manage"],
  ["orders.manage", "Manage revenue orders", "orders", "manage"],
  ["debts.view", "View debts", "debts", "view"],
  ["debts.manage", "Manage debts", "debts", "manage"],
  ["employees.view", "View employees", "employees", "view"],
  ["employees.manage", "Manage employees", "employees", "manage"],
  ["leave.self", "Manage own leave", "leave", "self"],
  ["leave.team", "Manage team leave", "leave", "team"],
  ["payroll.self", "View own payroll", "payroll", "self"],
  ["payroll.manage", "Manage payroll", "payroll", "manage"],
  ["reports.view", "View reports", "reports", "view"],
  ["imports.manage", "Manage imports", "imports", "manage"],
  ["settings.manage", "Manage settings", "settings", "manage"],
] as const;

const rolePermissions: Record<string, string[]> = {
  admin: baselinePermissions.map(([code]) => code),
  manager: [
    "customers.view",
    "customers.manage",
    "contracts.manage",
    "services.manage",
    "orders.manage",
    "debts.view",
    "debts.manage",
    "employees.view",
    "leave.team",
    "payroll.manage",
    "reports.view",
    "imports.manage",
    "settings.manage",
  ],
  department_head: [
    "customers.view",
    "orders.manage",
    "employees.view",
    "leave.team",
    "payroll.self",
    "reports.view",
  ],
  employee: ["customers.view", "leave.self", "payroll.self"],
};

export async function login(email: string, password: string) {
  await ensureAccessControl();

  const user = await getUserByEmail(email);
  if (!user?.passwordHash || user.status !== "active") {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  await db.query("update app_users set last_login_at = now(), updated_at = now() where id = $1", [user.id]);

  return createSession(user);
}

export async function setupInitialAdmin(email: string, displayName: string, password: string) {
  await ensureAccessControl();

  const existingUsers = await db.query<{ count: string }>(
    "select count(*)::text as count from app_users where deleted_at is null",
  );

  if (Number(existingUsers.rows[0]?.count ?? 0) > 0) {
    throw new BadRequestError("Hệ thống đã có người dùng, không thể setup admin đầu tiên");
  }

  const passwordHash = hashPassword(password);
  const client = await db.connect();

  try {
    await client.query("begin");
    const userResult = await client.query<UserRow>(
      `insert into app_users (email, display_name, password_hash, status)
       values ($1, $2, $3, 'active')
       returning
         id,
         email,
         display_name as "displayName",
         password_hash as "passwordHash",
         status,
         employee_id as "employeeId",
         null::text as "employeeName",
         null::uuid as "departmentId"`,
      [email.toLowerCase(), displayName, passwordHash],
    );
    await client.query(
      `insert into user_roles (user_id, role_id)
       select $1, id from roles where code = 'admin'
       on conflict do nothing`,
      [userResult.rows[0].id],
    );
    await client.query("commit");

    return createSession(userResult.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  return verifySessionToken(token);
}

export async function setSessionCookie(session: AuthSession) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, await signSessionPayload(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

async function createSession(user: UserRow): Promise<AuthSession> {
  const [roles, permissions, managedDepartmentIds] = await Promise.all([
    getUserRoles(user.id),
    getUserPermissions(user.id),
    getManagedDepartmentIds(user.employeeId),
  ]);

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    employeeId: user.employeeId,
    employeeName: user.employeeName,
    departmentId: user.departmentId,
    managedDepartmentIds,
    roles,
    permissions,
    scope: deriveScope(roles),
    expiresAt: getSessionExpiresAt(),
  };
}

async function getUserByEmail(email: string) {
  const result = await db.query<UserRow>(
    `select
       u.id,
       u.email,
       u.display_name as "displayName",
       u.password_hash as "passwordHash",
       u.status,
       u.employee_id as "employeeId",
       e.full_name as "employeeName",
       e.department_id as "departmentId"
     from app_users u
     left join employees e on e.id = u.employee_id
     where lower(u.email) = lower($1)
       and u.deleted_at is null
     limit 1`,
    [email],
  );

  return result.rows[0] ?? null;
}

async function getUserRoles(userId: string) {
  const result = await db.query<{ code: string }>(
    `select r.code
     from user_roles ur
     join roles r on r.id = ur.role_id
     where ur.user_id = $1
       and r.deleted_at is null
     order by r.code`,
    [userId],
  );

  return result.rows.map((row) => row.code);
}

async function getUserPermissions(userId: string) {
  const result = await db.query<{ code: string }>(
    `select distinct p.code
     from user_roles ur
     join roles r on r.id = ur.role_id
     join role_permissions rp on rp.role_id = r.id
     join permissions p on p.id = rp.permission_id
     where ur.user_id = $1
       and r.deleted_at is null
       and p.deleted_at is null
     order by p.code`,
    [userId],
  );

  return result.rows.map((row) => row.code);
}

async function getManagedDepartmentIds(employeeId: string | null) {
  if (!employeeId) {
    return [];
  }

  const result = await db.query<{ id: string }>(
    `select id
     from departments
     where manager_employee_id = $1
       and deleted_at is null`,
    [employeeId],
  );

  return result.rows.map((row) => row.id);
}

async function ensureAccessControl() {
  const client = await db.connect();

  try {
    await client.query("begin");
    for (const [code, name, description] of baselineRoles) {
      await client.query(
        `insert into roles (code, name, description, is_system)
         values ($1, $2, $3, true)
         on conflict (code) do update set
           name = excluded.name,
           description = excluded.description,
           is_system = true,
           updated_at = now()`,
        [code, name, description],
      );
    }

    for (const [code, name, module, action] of baselinePermissions) {
      await client.query(
        `insert into permissions (code, name, module, action)
         values ($1, $2, $3, $4)
         on conflict (code) do update set
           name = excluded.name,
           module = excluded.module,
           action = excluded.action,
           updated_at = now()`,
        [code, name, module, action],
      );
    }

    for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
      await client.query(
        `insert into role_permissions (role_id, permission_id)
         select r.id, p.id
         from roles r
         join permissions p on p.code = any($2::text[])
         where r.code = $1
         on conflict do nothing`,
        [roleCode, permissionCodes],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
