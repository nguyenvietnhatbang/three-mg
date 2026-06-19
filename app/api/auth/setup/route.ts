import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, handleApiError } from "@/lib/api-response";
import { setSessionCookie, setupInitialAdmin } from "@/features/auth/server";

const setupSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(2),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const parsed = setupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Dữ liệu setup không hợp lệ", parsed.error.flatten());
    }

    const session = await setupInitialAdmin(
      parsed.data.email,
      parsed.data.displayName,
      parsed.data.password,
    );
    await setSessionCookie(session);

    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
