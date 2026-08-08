import { z } from "zod";
import { hasDatabaseEnv } from "@/db/env";
import { reviewCard } from "@/lib/cards";
import { requireApiAuth } from "@/lib/session";

const reviewSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  if (!hasDatabaseEnv()) {
    return new Response("Database configuration is unavailable.", { status: 503 });
  }

  const result = reviewSchema.safeParse(await request.json());
  if (!result.success) {
    return Response.json({ error: "Provide a card ID and rating from 2 to 5." }, { status: 400 });
  }

  const next = await reviewCard(auth.session.user.id, result.data.cardId, result.data.rating);
  if (!next) return new Response("Card not found.", { status: 404 });
  return Response.json({ success: true, nextReviewAt: next.nextReviewAt.toISOString() });
}
