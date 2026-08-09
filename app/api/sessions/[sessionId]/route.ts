import { deleteAiSession } from "@/lib/ai-sessions";
import { requireApiAuth } from "@/lib/session";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  const { sessionId } = await context.params;
  const session = await deleteAiSession(auth.session.user.id, sessionId);
  if (!session) return new Response("Session not found.", { status: 404 });
  return Response.json({ success: true });
}
