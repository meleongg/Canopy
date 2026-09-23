import { z } from "zod";
import { matchDictionaryForCardAutofill } from "@/lib/card-autofill";
import { requireApiAuth } from "@/lib/session";

const schema = z.object({
  query: z.string().trim().min(1).max(100),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response("Enter a word, phrase, or English gloss to look up.", {
      status: 400,
    });
  }

  const result = await matchDictionaryForCardAutofill(
    auth.session.user.id,
    parsed.data.query,
  );
  return Response.json(result);
}
