import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";
import { PracticeSessionView } from "@/app/practice/practice-session-view";
import { PracticeSourcePicker } from "@/components/canopy/practice-source-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCollectionPage, getPracticeCards } from "@/lib/data";
import {
  PRACTICE_COUNTS,
  PRACTICE_SOURCES,
  practiceCountFrom,
  practiceSourceFrom,
} from "@/lib/practice";
import { serializeDashboardCards } from "@/lib/serialization";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{
    count?: string | string[];
    source?: string | string[];
  }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const count = practiceCountFrom(params.count);
  const source = practiceSourceFrom(params.source);
  const selectedSource = PRACTICE_SOURCES.find(
    (option) => option.value === source,
  )!;

  if (count) {
    const cards = serializeDashboardCards(
      await getPracticeCards(session.user.id, count, source),
    );
    return (
      <PracticeSessionView
        initialCards={cards}
        requestedCount={count}
        source={source}
      />
    );
  }

  const { total } = await getCollectionPage(session.user.id, {
    scope: "active",
    query: "",
    page: 1,
    pageSize: 1,
  });
  const choices = PRACTICE_COUNTS.filter((choice) => choice <= total);
  const fallback = total > 0 ? Math.min(total, PRACTICE_COUNTS[0]) : null;
  const hasSessionSizeChoices = choices.length > 0;

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
            Pick a small set of active cards for a relaxed recall round. This
            practice never changes when your cards are due.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              Add or import active vocabulary before starting a practice round.
            </p>
          ) : (
            <div className="space-y-6">
              <section>
                <h2 className="text-sm font-semibold">
                  1. Pick what to practise
                </h2>
                <PracticeSourcePicker key={source} source={source} />
              </section>
              <section>
                <h2 className="text-sm font-semibold">
                  {hasSessionSizeChoices
                    ? "2. Choose session size"
                    : "Your practice session"}
                </h2>
                {!hasSessionSizeChoices ? (
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    You have {total} active card{total === 1 ? "" : "s"}, so
                    this session will include them all.
                  </p>
                ) : null}
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {(hasSessionSizeChoices ? choices : [fallback]).map(
                    (choice) =>
                      choice ? (
                        <Button
                          asChild
                          className="h-auto min-h-20 flex-col"
                          key={choice}
                        >
                          <Link
                            href={`/practice?source=${source}&count=${choice}`}
                          >
                            Start a {choice}-card practice
                            <span className="text-xs font-normal opacity-80">
                              {selectedSource.label} selection
                            </span>
                          </Link>
                        </Button>
                      ) : null,
                  )}
                </div>
              </section>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
