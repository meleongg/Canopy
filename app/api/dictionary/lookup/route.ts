import { z } from "zod";
import { lookupActiveDictionary } from "@/lib/dictionary";
import { requireApiAuth } from "@/lib/session";

const lookupSchema = z.object({ text: z.string().trim().min(1).max(4_000) });

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  const parsed = lookupSchema.safeParse(await request.json());
  if (!parsed.success)
    return new Response("Provide text to look up.", { status: 400 });
  return Response.json({
    entries: await lookupActiveDictionary(
      auth.session.user.id,
      parsed.data.text,
    ),
  });
}
