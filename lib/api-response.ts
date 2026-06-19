import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function ok<T>(data: T, pagination?: Pagination) {
  return NextResponse.json({
    success: true,
    data,
    ...(pagination ? { pagination } : {}),
  });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { message, details } },
    { status: 400 },
  );
}

export function notFound(message = "Không tìm thấy dữ liệu") {
  return NextResponse.json(
    { success: false, error: { message } },
    { status: 404 },
  );
}

export function unauthorized(message = "Bạn cần đăng nhập để tiếp tục") {
  return NextResponse.json(
    { success: false, error: { message } },
    { status: 401 },
  );
}

export function forbidden(message = "Bạn không có quyền thực hiện thao tác này") {
  return NextResponse.json(
    { success: false, error: { message } },
    { status: 403 },
  );
}

export function serverError() {
  return NextResponse.json(
    { success: false, error: { message: "Có lỗi xảy ra, vui lòng thử lại" } },
    { status: 500 },
  );
}

export class BadRequestError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Bạn cần đăng nhập để tiếp tục") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Bạn không có quyền thực hiện thao tác này") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof BadRequestError) {
    return badRequest(error.message, error.details);
  }

  if (error instanceof UnauthorizedError) {
    return unauthorized(error.message);
  }

  if (error instanceof ForbiddenError) {
    return forbidden(error.message);
  }

  if (error instanceof ZodError) {
    return badRequest("Dữ liệu không hợp lệ", error.flatten());
  }

  console.error(error);
  return serverError();
}
