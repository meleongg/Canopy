import { getDashboardData } from "@/lib/data";
import { requireApiAuth } from "@/lib/session";
import { serializeDashboardCards } from "@/lib/serialization";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) {
    return auth.response;
  }

  const scopeParam = new URL(request.url).searchParams.get("scope");
  const scope =
    scopeParam === "archived" || scopeParam === "all" ? scopeParam : "active";
  const cards = await getDashboardData(auth.session.user.id, scope);
  return Response.json({ cards: serializeDashboardCards(cards) });
}
