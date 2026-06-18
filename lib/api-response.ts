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

export function serverError() {
  return NextResponse.json(
    { success: false, error: { message: "Có lỗi xảy ra, vui lòng thử lại" } },
    { status: 500 },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return badRequest("Dữ liệu không hợp lệ", error.flatten());
  }

  console.error(error);
  return serverError();
}

