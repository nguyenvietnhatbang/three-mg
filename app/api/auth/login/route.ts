import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, handleApiError, unauthorized } from "@/lib/api-response";
import { login, setSessionCookie } from "@/features/auth/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Email hoặc mật khẩu không hợp lệ", parsed.error.flatten());
    }

    const session = await login(parsed.data.email, parsed.data.password);
    if (!session) {
      return unauthorized("Email hoặc mật khẩu không đúng");
    }

    await setSessionCookie(session);

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return handleApiError(error);
  }
}
