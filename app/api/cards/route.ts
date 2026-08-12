import { getCollectionPage, getDashboardData } from "@/lib/data";
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
  const query = new URL(request.url).searchParams.get("query");
  const page = Number(new URL(request.url).searchParams.get("page"));
  if (scope !== "all" && Number.isInteger(page) && page > 0) {
    const result = await getCollectionPage(auth.session.user.id, {
      scope,
      query: query ?? "",
      page,
      pageSize: 20,
    });
    return Response.json({
      cards: serializeDashboardCards(result.cards),
      total: result.total,
      page,
      pageSize: 20,
    });
  }
  const cards = await getDashboardData(auth.session.user.id, scope);
  return Response.json({ cards: serializeDashboardCards(cards) });
}
