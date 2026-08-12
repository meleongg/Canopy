import { CollectionView } from "@/app/collection/collection-view";
import { getCollectionPage } from "@/lib/data";
import { serializeDashboardCards } from "@/lib/serialization";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const session = await requireAuth();
  const result = await getCollectionPage(session.user.id, {
    scope: "active",
    query: "",
    page: 1,
    pageSize: 20,
  });
  return (
    <CollectionView
      initialCards={serializeDashboardCards(result.cards)}
      initialTotal={result.total}
    />
  );
}
