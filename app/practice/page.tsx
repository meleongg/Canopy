import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";
import { PracticeSessionView } from "@/app/practice/practice-session-view";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCollectionPage, getPracticeCards } from "@/lib/data";
import { serializeDashboardCards } from "@/lib/serialization";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

const suggestedCounts = [5, 10, 20];

function countFrom(value: string | string[] | undefined) {
  const count = Number(Array.isArray(value) ? value[0] : value);
  return suggestedCounts.includes(count) ? count : null;
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ count?: string | string[] }>;
}) {
  const session = await requireAuth();
  const count = countFrom((await searchParams).count);

  if (count) {
    const cards = serializeDashboardCards(
      await getPracticeCards(session.user.id, count),
    );
    return <PracticeSessionView initialCards={cards} requestedCount={count} />;
  }

  const { total } = await getCollectionPage(session.user.id, {
    scope: "active",
    query: "",
    page: 1,
    pageSize: 1,
  });
  const choices = suggestedCounts.filter((choice) => choice <= total);
  const fallback = total > 0 ? Math.min(total, suggestedCounts[0]) : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        href="/dashboard"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <Card className="mt-8">
        <CardHeader>
          <Leaf className="size-6 text-primary" />
          <CardTitle className="mt-3">Free practice</CardTitle>
          <CardDescription>
            Pick a small random set of active cards for a relaxed recall round.
            This practice never changes when your cards are due.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              Add or import active vocabulary before starting a practice round.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {(choices.length > 0 ? choices : [fallback]).map((choice) =>
                choice ? (
                  <Button
                    asChild
                    className="h-auto min-h-20 flex-col"
                    key={choice}
                  >
                    <Link href={`/practice?count=${choice}`}>
                      Practice {choice}
                      <span className="text-xs font-normal opacity-80">
                        Random active cards
                      </span>
                    </Link>
                  </Button>
                ) : null,
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
