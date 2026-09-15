import { z } from "zod";
import {
  dictionaryPracticeExercises,
  getDictionaryPracticeRound,
} from "@/lib/dictionary";
import { requireApiAuth } from "@/lib/session";

const querySchema = z.object({
  exercise: z.enum(dictionaryPracticeExercises),
});

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;

  const parsed = querySchema.safeParse({
    exercise: new URL(request.url).searchParams.get("exercise"),
  });
  if (!parsed.success) {
    return new Response("Choose a supported Explore Chinese exercise.", {
      status: 400,
    });
  }

  const round = await getDictionaryPracticeRound(
    auth.session.user.id,
    parsed.data.exercise,
  );
  if (!round) {
    return new Response(
      "The active dictionary does not have enough entries for that exercise yet.",
      { status: 503 },
    );
  }

  return Response.json({ round });
}
