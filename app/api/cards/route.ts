import { getDashboardData } from "@/lib/data";
import { requireApiAuth } from "@/lib/session";
import { serializeDashboardCards } from "@/lib/serialization";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.response) {
    return auth.response;
  }

  const cards = await getDashboardData(auth.session.user.id);
  return Response.json({ cards: serializeDashboardCards(cards) });
}
