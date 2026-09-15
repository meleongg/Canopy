import { ExploreView } from "@/app/explore/explore-view";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  await requireAuth();
  return <ExploreView />;
}
