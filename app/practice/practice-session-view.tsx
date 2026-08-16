"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Leaf } from "lucide-react";
import type { WorkspaceCard } from "@/components/canopy/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { practiceSourceLabel, type PracticeSource } from "@/lib/practice";

export function PracticeSessionView({
  initialCards,
  requestedCount,
  source,
}: {
  initialCards: WorkspaceCard[];
  requestedCount: number;
  source: PracticeSource;
}) {
  const [cards, setCards] = useState(initialCards);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const card = cards[0];
  const completed = initialCards.length - cards.length;
  const isRevealed = revealedCardId === card?.id;

  const reveal = useCallback(() => {
    if (card) setRevealedCardId(card.id);
  }, [card]);

  const next = useCallback(() => {
    if (!card || !isRevealed) return;
    setCards((current) => current.slice(1));
    setRevealedCardId(null);
  }, [card, isRevealed]);

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
      if (!card || (event.key !== " " && event.key !== "Enter")) return;
      event.preventDefault();
      if (isRevealed) next();
      else reveal();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [card, isRevealed, next, reveal]);

  if (!card) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          href="/practice"
        >
          <ArrowLeft className="size-4" /> Free practice
        </Link>
        <Card className="mt-8 text-center">
          <CardContent className="py-12">
            <Leaf className="mx-auto size-8 text-primary" />
            <h1 className="mt-4 font-serif text-3xl font-bold">
              {initialCards.length > 0
                ? "Practice complete"
                : "No cards available"}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {initialCards.length > 0
                ? `You practised ${completed} card${completed === 1 ? "" : "s"}. Your review schedule is unchanged.`
                : `There were no active cards available for this ${requestedCount}-card practice round.`}
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
          <ArrowLeft className="size-4" /> Exit practice
        </Link>
        <Badge>
          {completed + 1} of {initialCards.length}
        </Badge>
      </div>
      <header className="mt-8 border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase text-primary">
          Free practice
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight md:text-4xl">
          Give this word a moment
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This is a quiet recall round. It does not change your review rhythm.
        </p>
      </header>
      <Card className="mt-6">
        <CardHeader className="border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {practiceSourceLabel(source)} · {card.languageCode}
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
            <section>
              <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                Recall the meaning
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                When you have an answer in mind, reveal the card to compare it.
              </p>
              <Button
                className="mt-5 w-full sm:w-auto"
                onClick={reveal}
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
              <section>
                <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                  Answer
                </h2>
                <ul className="mt-3 space-y-2 text-base leading-7">
                  {card.definitions.map((definition) => (
                    <li key={definition}>{definition}</li>
                  ))}
                </ul>
              </section>
              {card.aiExampleContexts.length > 0 ? (
                <section>
                  <h2 className="text-xs font-semibold uppercase text-muted-foreground">
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
              <Button className="w-full sm:w-auto" onClick={next} type="button">
                Next card{" "}
                <kbd className="rounded border border-current/40 px-1">
                  Space
                </kbd>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
