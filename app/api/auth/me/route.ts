import { ok, unauthorized } from "@/lib/api-response";
import { getCurrentSession } from "@/features/auth/server";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return unauthorized();
  }

  return ok(session);
}
