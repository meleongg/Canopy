import { getDashboardData } from "@/lib/data";
import { requireApiAuth } from "@/lib/session";
import { serializeDashboardCards } from "@/lib/serialization";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.response) {
    return auth.response;
  }

  const cards = serializeDashboardCards(
    await getDashboardData(auth.session.user.id),
  );
  const now = Date.now();
  const dueCount = cards.filter(
    (card) => new Date(card.nextReviewAt).getTime() <= now,
  ).length;

  return Response.json({
    cards,
    stats: {
      totalCards: cards.length,
      dueCount,
      contextCount: cards.reduce(
        (count, card) => count + card.aiExampleContexts.length,
        0,
      ),
    },
  });
}
