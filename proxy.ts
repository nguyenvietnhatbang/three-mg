import { NextRequest, NextResponse } from "next/server";
import { canAccess, getRequiredPermissionForPath } from "@/features/auth/permissions";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/features/auth/session-token";

const publicPathPrefixes = [
  "/login",
  "/setup",
  "/forbidden",
  "/favicon.ico",
  "/_next",
];

const publicApiPaths = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/setup",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (!session) {
    return handleUnauthenticated(request);
  }

  const requiredPermission = getRequiredPermissionForPath(pathname, request.method);
  if (requiredPermission && !canAccess(session, requiredPermission.module, requiredPermission.action)) {
    return handleForbidden(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function isPublicPath(pathname: string) {
  return (
    publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    publicApiPaths.includes(pathname)
  );
}

function handleUnauthenticated(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: { message: "Bạn cần đăng nhập để tiếp tục" } },
      { status: 401 },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

function handleForbidden(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: { message: "Bạn không có quyền thực hiện thao tác này" } },
      { status: 403 },
    );
  }

  const forbiddenUrl = request.nextUrl.clone();
  forbiddenUrl.pathname = "/forbidden";
  forbiddenUrl.search = "";

  return NextResponse.redirect(forbiddenUrl);
}
