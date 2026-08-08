import { listAiSessions } from "@/lib/ai-sessions";
import { requireApiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  return Response.json({
    sessions: await listAiSessions(auth.session.user.id),
  });
}
