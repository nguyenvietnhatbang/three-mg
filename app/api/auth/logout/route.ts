import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/features/auth/server";

export async function POST() {
  await clearSessionCookie();

  return NextResponse.json({ success: true, data: { loggedOut: true } });
}
