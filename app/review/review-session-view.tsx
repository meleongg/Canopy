"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Leaf } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCardsByScope } from "@/components/canopy/card-utils";
import type { WorkspaceCard } from "@/components/canopy/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryKeys } from "@/lib/query-keys";

const ratingOptions = [
  { rating: 2, label: "Hard", description: "Needs another look", key: "1" },
  {
    rating: 3,
    label: "Pass",
    description: "Remembered with effort",
    key: "2",
  },
  { rating: 4, label: "Good", description: "Remembered", key: "3" },
  {
    rating: 5,
    label: "Easy",
    description: "Came back instantly",
    key: "4",
  },
] as const;

type ReviewRating = (typeof ratingOptions)[number]["rating"];

export function ReviewSessionView({
  initialDueCards,
}: {
  initialDueCards: WorkspaceCard[];
}) {
  const queryClient = useQueryClient();
  const [initialCount] = useState(initialDueCards.length);
  const [error, setError] = useState("");
  const [rating, setRating] = useState<ReviewRating | null>(null);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const { data: cards = [] } = useQuery({
    queryKey: queryKeys.reviewQueue,
    queryFn: async () => {
      const activeCards = await fetchCardsByScope("active");
      const now = new Date();
      return activeCards.filter((card) => new Date(card.nextReviewAt) <= now);
    },
    initialData: initialDueCards,
  });
  const card = cards[0];
  const reviewedCount = initialCount - cards.length;
  const isRevealed = revealedCardId === card?.id;
  const selectedRating = ratingOptions.find(
    (option) => option.rating === rating,
  );

  const submitRating = useCallback(
    async (nextRating: ReviewRating) => {
      if (!card || rating !== null) return;

      setError("");
      setRating(nextRating);
      try {
        const response = await fetch("/api/cards/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.id, rating: nextRating }),
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }

        queryClient.setQueryData<WorkspaceCard[]>(
          queryKeys.reviewQueue,
          (current = []) =>
            current.filter((queuedCard) => queuedCard.id !== card.id),
        );
        void queryClient.invalidateQueries({
          queryKey: queryKeys.dashboardCards,
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.overstorySeeds,
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.understorySeeds,
        });
        setRevealedCardId(null);
      } catch {
        setError("That rating could not be saved. Please try again.");
      } finally {
        setRating(null);
      }
    },
    [card, queryClient, rating],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (target instanceof HTMLElement &&
          (target.closest("a") !== null ||
            target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)))
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (!isRevealed && card && (key === " " || key === "enter")) {
        event.preventDefault();
        setRevealedCardId(card.id);
        return;
      }

      if (!isRevealed || rating !== null) return;

      const option = ratingOptions.find(
        (candidate) =>
          candidate.key === key || candidate.label[0].toLowerCase() === key,
      );
      if (option) {
        event.preventDefault();
        void submitRating(option.rating);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [card, isRevealed, rating, submitRating]);

  if (!card) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          href="/dashboard"
        >
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
        <Card className="mt-8 text-center">
          <CardContent className="py-12">
            <Leaf className="mx-auto size-8 text-primary" />
            <h1 className="mt-4 font-serif text-3xl font-bold">
              {initialCount > 0 ? "Review complete" : "Nothing due just now"}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {initialCount > 0
                ? `You revisited ${reviewedCount} card${reviewedCount === 1 ? "" : "s"}. Your queue will return when it is time.`
                : "Your next cards will appear here when they are ready for another look."}
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard">Return to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          href="/dashboard"
        >
          <ArrowLeft className="size-4" /> Exit review
        </Link>
        <Badge>
          {reviewedCount + 1} of {initialCount}
        </Badge>
      </div>

      <header className="mt-8 border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase text-primary">
          Focused review
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight md:text-4xl">
          Give this word a moment
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Take a moment to recall the meaning before you reveal it.
        </p>
      </header>

      <Card className="mt-6">
        <CardHeader className="border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {card.languageCode}
              </p>
              <CardTitle className="mt-2 font-serif text-4xl md:text-5xl">
                {card.targetText}
              </CardTitle>
              {card.phoneticReading.length > 0 ? (
                <p className="mt-3 text-base text-muted-foreground">
                  {card.phoneticReading.join(" ")}
                </p>
              ) : null}
            </div>
            <Badge>{cards.length} left</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {!isRevealed ? (
            <section aria-labelledby="recall-heading">
              <h2
                className="text-xs font-semibold uppercase text-muted-foreground"
                id="recall-heading"
              >
                Recall the meaning
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                When you have an answer in mind, reveal the card to compare it.
              </p>
              <Button
                className="mt-5 w-full sm:w-auto"
                onClick={() => setRevealedCardId(card.id)}
                type="button"
              >
                Show answer{" "}
                <kbd className="rounded border border-current/40 px-1">
                  Space
                </kbd>
              </Button>
            </section>
          ) : (
            <>
              <section aria-labelledby="definitions-heading">
                <h2
                  className="text-xs font-semibold uppercase text-muted-foreground"
                  id="definitions-heading"
                >
                  Answer
                </h2>
                <ul className="mt-3 space-y-2 text-base leading-7">
                  {card.definitions.map((definition) => (
                    <li key={definition}>{definition}</li>
                  ))}
                </ul>
              </section>

              {card.aiExampleContexts.length > 0 ? (
                <section aria-labelledby="context-heading">
                  <h2
                    className="text-xs font-semibold uppercase text-muted-foreground"
                    id="context-heading"
                  >
                    Saved context
                  </h2>
                  <div className="mt-3 space-y-3">
                    {card.aiExampleContexts.map((context, index) => (
                      <div
                        className="rounded-lg border border-border bg-background p-4"
                        key={`${context.sentence}-${index}`}
                      >
                        <p className="font-medium leading-6">
                          {context.sentence}
                        </p>
                        {context.phonetic ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {context.phonetic}
                          </p>
                        ) : null}
                        {context.translation ? (
                          <p className="mt-2 text-sm leading-6">
                            {context.translation}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section aria-labelledby="rating-heading">
                <h2
                  className="text-xs font-semibold uppercase text-muted-foreground"
                  id="rating-heading"
                >
                  How did it feel?
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ratingOptions.map((option) => (
                    <Button
                      className="h-auto min-h-20 flex-col items-start gap-1 whitespace-normal px-4 py-3 text-left"
                      disabled={rating !== null}
                      key={option.rating}
                      onClick={() => void submitRating(option.rating)}
                      type="button"
                      variant="outline"
                    >
                      <span className="flex w-full items-center justify-between gap-3">
                        {option.label}
                        <kbd className="rounded border border-current/40 px-1 text-[10px] font-semibold">
                          {option.key}
                        </kbd>
                      </span>
                      <span className="text-xs font-normal opacity-80">
                        {option.description}
                      </span>
                    </Button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Your choice helps Canopy decide when to bring this card back.
                  Use 1–4, or H, P, G, and E, to rate without reaching for the
                  mouse.
                </p>
                {selectedRating ? (
                  <p
                    className="mt-3 text-sm text-muted-foreground"
                    role="status"
                  >
                    {selectedRating.label} — {selectedRating.description}
                  </p>
                ) : null}
                {error ? (
                  <p
                    className="mt-3 rounded-lg border border-primary/40 bg-background p-3 text-sm"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
