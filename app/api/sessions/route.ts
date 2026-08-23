import { z } from "zod";
import {
  decodeAiSessionCursor,
  listAiSessions,
} from "@/lib/ai-sessions";
import { requireApiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

const sessionQuerySchema = z.object({
  cursor: z.string().optional(),
  filter: z.enum(["all", "story_sandbox", "helper_chat"]).default("all"),
});

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  const parsed = sessionQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return new Response("Provide a valid history filter.", { status: 400 });
  }
  const cursor = parsed.data.cursor
    ? decodeAiSessionCursor(parsed.data.cursor)
    : null;
  if (parsed.data.cursor && !cursor) {
    return new Response("Provide a valid history cursor.", { status: 400 });
  }

  return Response.json(
    await listAiSessions(auth.session.user.id, {
      cursor,
      filter: parsed.data.filter,
    }),
  );
}
